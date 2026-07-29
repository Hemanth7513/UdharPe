-- Security & data-integrity hardening
-- 1) bill_id on settlements
-- 2) Atomic create_bill / record_payment RPCs
-- 3) Tighten staff RLS with WITH CHECK + least privilege writes
-- 4) profiles sync from auth metadata + insert policy
-- 5) Helper: bill status from remaining_amount

-- Ensure staff_roles exists (idempotent if RBAC migration already applied)
CREATE TABLE IF NOT EXISTS public.staff_roles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    business_id UUID NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('staff')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.staff_roles ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Settlements ↔ bills link
-- ---------------------------------------------------------------------------
ALTER TABLE public.settlements
  ADD COLUMN IF NOT EXISTS bill_id uuid REFERENCES public.bills(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS settlements_bill_id_idx ON public.settlements(bill_id);

-- ---------------------------------------------------------------------------
-- Profiles: allow insert for own row; backfill; sync trigger
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Backfill profiles from auth.users metadata where missing
INSERT INTO public.profiles (id, firm_name, owner_name)
SELECT
  u.id,
  COALESCE(NULLIF(u.raw_user_meta_data->>'firm_name', ''), 'My Business'),
  NULLIF(u.raw_user_meta_data->>'owner_name', '')
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, firm_name, owner_name)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'firm_name', ''), 'My Business'),
    NULLIF(NEW.raw_user_meta_data->>'owner_name', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    firm_name = EXCLUDED.firm_name,
    owner_name = COALESCE(EXCLUDED.owner_name, public.profiles.owner_name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_profile();

-- ---------------------------------------------------------------------------
-- Status helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bill_status_from_remaining(p_amount numeric, p_remaining numeric)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_remaining <= 0 THEN 'paid'
    WHEN p_remaining < p_amount THEN 'partial'
    ELSE 'pending'
  END;
$$;

-- ---------------------------------------------------------------------------
-- Atomic: create bill + bump outstanding
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_bill(
  p_customer_id uuid,
  p_amount numeric,
  p_due_date date,
  p_note text DEFAULT NULL,
  p_bill_no text DEFAULT NULL
)
RETURNS public.bills
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_customer public.customers%ROWTYPE;
  v_bill public.bills%ROWTYPE;
  v_bill_no text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;
  IF p_due_date IS NULL THEN
    RAISE EXCEPTION 'Due date is required';
  END IF;

  SELECT * INTO v_customer
  FROM public.customers
  WHERE id = p_customer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  IF v_customer.business_id <> v_uid
     AND NOT EXISTS (
       SELECT 1 FROM public.staff_roles sr
       WHERE sr.user_id = v_uid AND sr.business_id = v_customer.business_id
     ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  v_bill_no := COALESCE(NULLIF(p_bill_no, ''), 'INV-' || right(replace(gen_random_uuid()::text, '-', ''), 6));

  INSERT INTO public.bills (
    business_id, customer_id, amount, remaining_amount, due_date, note, status, bill_no
  ) VALUES (
    v_customer.business_id, p_customer_id, p_amount, p_amount, p_due_date, p_note, 'pending', v_bill_no
  )
  RETURNING * INTO v_bill;

  UPDATE public.customers
  SET total_outstanding = total_outstanding + p_amount
  WHERE id = p_customer_id;

  RETURN v_bill;
END;
$$;

REVOKE ALL ON FUNCTION public.create_bill(uuid, numeric, date, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_bill(uuid, numeric, date, text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Atomic: record payment (specific bill or FIFO across open bills)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_payment(
  p_customer_id uuid,
  p_amount numeric,
  p_note text DEFAULT NULL,
  p_bill_id uuid DEFAULT NULL
)
RETURNS public.settlements
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_customer public.customers%ROWTYPE;
  v_settlement public.settlements%ROWTYPE;
  v_remaining numeric;
  v_apply numeric;
  v_bill public.bills%ROWTYPE;
  v_left numeric;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  SELECT * INTO v_customer
  FROM public.customers
  WHERE id = p_customer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  IF v_customer.business_id <> v_uid
     AND NOT EXISTS (
       SELECT 1 FROM public.staff_roles sr
       WHERE sr.user_id = v_uid AND sr.business_id = v_customer.business_id
     ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF p_amount > v_customer.total_outstanding THEN
    RAISE EXCEPTION 'Payment exceeds outstanding balance';
  END IF;

  v_left := p_amount;

  IF p_bill_id IS NOT NULL THEN
    SELECT * INTO v_bill
    FROM public.bills
    WHERE id = p_bill_id AND customer_id = p_customer_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Bill not found';
    END IF;
    IF p_amount > v_bill.remaining_amount THEN
      RAISE EXCEPTION 'Payment exceeds bill remaining amount';
    END IF;

    v_remaining := v_bill.remaining_amount - p_amount;
    UPDATE public.bills
    SET remaining_amount = v_remaining,
        status = public.bill_status_from_remaining(v_bill.amount, v_remaining)
    WHERE id = v_bill.id;

    INSERT INTO public.settlements (business_id, customer_id, amount_paid, note, bill_id)
    VALUES (
      v_customer.business_id,
      p_customer_id,
      p_amount,
      COALESCE(p_note, '') || CASE WHEN v_bill.bill_no IS NOT NULL THEN ' (Ref: ' || v_bill.bill_no || ')' ELSE '' END,
      p_bill_id
    )
    RETURNING * INTO v_settlement;
  ELSE
    -- FIFO apply across open bills
    FOR v_bill IN
      SELECT * FROM public.bills
      WHERE customer_id = p_customer_id
        AND remaining_amount > 0
        AND status IN ('pending', 'partial')
      ORDER BY due_date ASC NULLS LAST, created_at ASC
      FOR UPDATE
    LOOP
      EXIT WHEN v_left <= 0;
      v_apply := LEAST(v_left, v_bill.remaining_amount);
      v_remaining := v_bill.remaining_amount - v_apply;

      UPDATE public.bills
      SET remaining_amount = v_remaining,
          status = public.bill_status_from_remaining(v_bill.amount, v_remaining)
      WHERE id = v_bill.id;

      v_left := v_left - v_apply;
    END LOOP;

    IF v_left > 0 THEN
      RAISE EXCEPTION 'Could not fully allocate payment to open bills';
    END IF;

    INSERT INTO public.settlements (business_id, customer_id, amount_paid, note, bill_id)
    VALUES (v_customer.business_id, p_customer_id, p_amount, p_note, NULL)
    RETURNING * INTO v_settlement;
  END IF;

  UPDATE public.customers
  SET total_outstanding = total_outstanding - p_amount
  WHERE id = p_customer_id;

  RETURN v_settlement;
END;
$$;

REVOKE ALL ON FUNCTION public.record_payment(uuid, numeric, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_payment(uuid, numeric, text, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Tighten staff RLS: explicit WITH CHECK; staff cannot delete
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'customers' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.customers', pol.policyname);
  END LOOP;
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'bills' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.bills', pol.policyname);
  END LOOP;
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'settlements' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.settlements', pol.policyname);
  END LOOP;
END $$;

-- Customers
CREATE POLICY "owners_staff_select_customers" ON public.customers
  FOR SELECT USING (
    business_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.staff_roles sr WHERE sr.user_id = auth.uid() AND sr.business_id = customers.business_id)
  );

CREATE POLICY "owners_staff_insert_customers" ON public.customers
  FOR INSERT WITH CHECK (
    business_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.staff_roles sr WHERE sr.user_id = auth.uid() AND sr.business_id = customers.business_id)
  );

CREATE POLICY "owners_staff_update_customers" ON public.customers
  FOR UPDATE
  USING (
    business_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.staff_roles sr WHERE sr.user_id = auth.uid() AND sr.business_id = customers.business_id)
  )
  WITH CHECK (
    business_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.staff_roles sr WHERE sr.user_id = auth.uid() AND sr.business_id = customers.business_id)
  );

CREATE POLICY "owners_delete_customers" ON public.customers
  FOR DELETE USING (business_id = auth.uid());

-- Bills
CREATE POLICY "owners_staff_select_bills" ON public.bills
  FOR SELECT USING (
    business_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.staff_roles sr WHERE sr.user_id = auth.uid() AND sr.business_id = bills.business_id)
  );

CREATE POLICY "owners_staff_insert_bills" ON public.bills
  FOR INSERT WITH CHECK (
    business_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.staff_roles sr WHERE sr.user_id = auth.uid() AND sr.business_id = bills.business_id)
  );

CREATE POLICY "owners_staff_update_bills" ON public.bills
  FOR UPDATE
  USING (
    business_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.staff_roles sr WHERE sr.user_id = auth.uid() AND sr.business_id = bills.business_id)
  )
  WITH CHECK (
    business_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.staff_roles sr WHERE sr.user_id = auth.uid() AND sr.business_id = bills.business_id)
  );

CREATE POLICY "owners_delete_bills" ON public.bills
  FOR DELETE USING (business_id = auth.uid());

-- Settlements
CREATE POLICY "owners_staff_select_settlements" ON public.settlements
  FOR SELECT USING (
    business_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.staff_roles sr WHERE sr.user_id = auth.uid() AND sr.business_id = settlements.business_id)
  );

CREATE POLICY "owners_staff_insert_settlements" ON public.settlements
  FOR INSERT WITH CHECK (
    business_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.staff_roles sr WHERE sr.user_id = auth.uid() AND sr.business_id = settlements.business_id)
  );

CREATE POLICY "owners_staff_update_settlements" ON public.settlements
  FOR UPDATE
  USING (
    business_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.staff_roles sr WHERE sr.user_id = auth.uid() AND sr.business_id = settlements.business_id)
  )
  WITH CHECK (
    business_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.staff_roles sr WHERE sr.user_id = auth.uid() AND sr.business_id = settlements.business_id)
  );

CREATE POLICY "owners_delete_settlements" ON public.settlements
  FOR DELETE USING (business_id = auth.uid());

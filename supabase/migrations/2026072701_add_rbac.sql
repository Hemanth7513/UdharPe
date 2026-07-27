-- Migration: Add Staff Roles (RBAC)
-- Creates staff_roles table and updates RLS for customers and bills.

CREATE TABLE IF NOT EXISTS public.staff_roles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    business_id UUID NOT NULL, -- references owner's auth.users(id)
    role TEXT NOT NULL CHECK (role IN ('staff')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for staff_roles
ALTER TABLE public.staff_roles ENABLE ROW LEVEL SECURITY;

-- Owner can read/manage their staff
CREATE POLICY "owner_manage_staff" ON public.staff_roles
    FOR ALL
    USING (auth.uid() = business_id);

-- Staff can read their own role
CREATE POLICY "staff_read_own_role" ON public.staff_roles
    FOR SELECT
    USING (auth.uid() = user_id);

-- Update RLS for customers
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'customers' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.customers', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Enable access for owners and staff" ON public.customers
    FOR ALL
    USING (
        business_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.staff_roles sr WHERE sr.user_id = auth.uid() AND sr.business_id = customers.business_id)
    );

-- Update RLS for bills
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'bills' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.bills', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Enable access for owners and staff" ON public.bills
    FOR ALL
    USING (
        business_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.staff_roles sr WHERE sr.user_id = auth.uid() AND sr.business_id = bills.business_id)
    );

-- Update RLS for settlements
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'settlements' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.settlements', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Enable access for owners and staff" ON public.settlements
    FOR ALL
    USING (
        business_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.staff_roles sr WHERE sr.user_id = auth.uid() AND sr.business_id = settlements.business_id)
    );

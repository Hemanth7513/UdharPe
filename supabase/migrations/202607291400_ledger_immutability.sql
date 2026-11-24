-- ============================================================
-- Migration: Ledger Immutability & Financial Integrity
-- Enforces strictly append-only settlements (no updates or deletes).
-- Financial settlements must remain immutable for audit integrity.
-- ============================================================

-- 1. Drop any UPDATE or DELETE policies on settlements
DROP POLICY IF EXISTS "owners_staff_update_settlements" ON public.settlements;
DROP POLICY IF EXISTS "owners_delete_settlements" ON public.settlements;
DROP POLICY IF EXISTS "Owners update own settlements" ON public.settlements;
DROP POLICY IF EXISTS "Owners delete own settlements" ON public.settlements;

-- 2. Ensure settlements has ONLY SELECT and INSERT policies
DO $$
BEGIN
  -- Re-verify SELECT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'settlements' AND policyname = 'owners_staff_select_settlements'
  ) THEN
    CREATE POLICY "owners_staff_select_settlements" ON public.settlements
      FOR SELECT USING (
        business_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.staff_roles sr 
          WHERE sr.user_id = auth.uid() AND sr.business_id = settlements.business_id
        )
      );
  END IF;

  -- Re-verify INSERT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'settlements' AND policyname = 'owners_staff_insert_settlements'
  ) THEN
    CREATE POLICY "owners_staff_insert_settlements" ON public.settlements
      FOR INSERT WITH CHECK (
        business_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.staff_roles sr 
          WHERE sr.user_id = auth.uid() AND sr.business_id = settlements.business_id
        )
      );
  END IF;
END $$;

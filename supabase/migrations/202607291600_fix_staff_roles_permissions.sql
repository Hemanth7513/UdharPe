-- ============================================================
-- Migration: Fix Table Permissions for Authenticated Role
-- Resolves "permission denied for table staff_roles" during
-- RLS policy evaluation on customers, bills, and settlements.
-- ============================================================

-- 1. Grant required table permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bills TO authenticated;
GRANT SELECT, INSERT ON public.settlements TO authenticated;

-- 2. Ensure staff_roles RLS policies exist
ALTER TABLE public.staff_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_manage_staff" ON public.staff_roles;
CREATE POLICY "owner_manage_staff" ON public.staff_roles
  FOR ALL USING (auth.uid() = business_id);

DROP POLICY IF EXISTS "staff_read_own_role" ON public.staff_roles;
CREATE POLICY "staff_read_own_role" ON public.staff_roles
  FOR SELECT USING (auth.uid() = user_id);

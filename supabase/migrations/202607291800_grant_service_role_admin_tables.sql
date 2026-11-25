-- Ensure service_role has explicit read access to ledger tables for admin-stats & reminders Edge Functions
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT ON public.customers, public.bills, public.settlements, public.profiles TO service_role;

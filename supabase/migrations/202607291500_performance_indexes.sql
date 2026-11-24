-- ============================================================
-- Migration: High-Performance Database Indexes
-- Optimizes queries for merchant dashboards, customer ledgers,
-- and automated reminder cron jobs.
-- ============================================================

-- Customers lookup by business
CREATE INDEX IF NOT EXISTS idx_customers_business_id 
  ON public.customers (business_id);

-- Bills lookup by business & customer (for ledger history)
CREATE INDEX IF NOT EXISTS idx_bills_business_customer 
  ON public.bills (business_id, customer_id, created_at DESC);

-- Overdue bills lookup (optimizes send-reminders cron job)
CREATE INDEX IF NOT EXISTS idx_bills_overdue_lookup 
  ON public.bills (status, due_date) 
  WHERE remaining_amount > 0;

-- Settlements lookup by business & customer (for ledger history)
CREATE INDEX IF NOT EXISTS idx_settlements_business_customer 
  ON public.settlements (business_id, customer_id, created_at DESC);

-- Profiles lookup
CREATE INDEX IF NOT EXISTS idx_profiles_created_at 
  ON public.profiles (created_at DESC);

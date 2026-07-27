-- Add new fields to customers table
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS firm_name TEXT,
ADD COLUMN IF NOT EXISTS gst_details TEXT,
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add new fields to bills table
ALTER TABLE public.bills
ADD COLUMN IF NOT EXISTS bill_no TEXT,
ADD COLUMN IF NOT EXISTS due_date DATE;

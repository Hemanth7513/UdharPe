-- Prevent duplicate phone numbers per business (when phone is provided)
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_business_phone_unique
ON public.customers (business_id, btrim(phone))
WHERE phone IS NOT NULL AND btrim(phone) <> '';

-- Allow FIFO customer-level settlements (spanning multiple bills) to have NULL bill_id
ALTER TABLE public.settlements
ALTER COLUMN bill_id DROP NOT NULL;

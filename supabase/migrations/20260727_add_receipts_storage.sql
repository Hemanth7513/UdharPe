-- Add receipt_url to bills
ALTER TABLE public.bills
ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Create receipts storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for receipts bucket
-- Allow public access to view receipts
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'receipts' );

-- Allow authenticated users to insert receipts
CREATE POLICY "Auth Users Insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'receipts' );

-- Allow authenticated users to update their own receipts
CREATE POLICY "Auth Users Update"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'receipts' AND auth.uid() = owner );

-- Allow authenticated users to delete their own receipts
CREATE POLICY "Auth Users Delete"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'receipts' AND auth.uid() = owner );

-- Add progress and step columns to documents for better UX
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS index_progress integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS index_step text DEFAULT 'queued',
  ADD COLUMN IF NOT EXISTS index_error text;

-- Keep processing_status but standardize values used by functions
-- Values already allowed by CHECK: pending, processing, completed, failed

-- Helpful index for filtering by user and updated status
CREATE INDEX IF NOT EXISTS idx_documents_user_status ON public.documents(user_id, processing_status);


-- Fix wrong FK on documents.conversation_id referencing documents instead of chat_conversations
-- 1) Ensure column exists
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS conversation_id uuid;

-- 2) Drop incorrect foreign key if present
ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_conversation_id_fkey;

-- 3) Add correct foreign key to chat_conversations(id)
ALTER TABLE public.documents
  ADD CONSTRAINT documents_conversation_id_fkey
  FOREIGN KEY (conversation_id)
  REFERENCES public.chat_conversations(id)
  ON DELETE SET NULL;

-- 4) Ensure index exists for performance
CREATE INDEX IF NOT EXISTS idx_documents_conversation_id ON public.documents(conversation_id);


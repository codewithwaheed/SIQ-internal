-- Add conversation_id to documents table for better document-conversation linking
ALTER TABLE public.documents 
ADD COLUMN conversation_id UUID REFERENCES public.documents(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_documents_conversation_id ON public.documents(conversation_id);

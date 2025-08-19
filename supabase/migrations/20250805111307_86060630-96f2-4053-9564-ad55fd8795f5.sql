-- Enable real-time for chat tables
ALTER TABLE public.chat_conversations REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

-- Add chat tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Create indexes for better performance on chat queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_timestamp 
ON public.chat_messages(conversation_id, timestamp);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_updated 
ON public.chat_conversations(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_org_updated 
ON public.chat_conversations(org_id, updated_at DESC);

-- Add a status column to chat_conversations for better conversation management
ALTER TABLE public.chat_conversations 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' 
CHECK (status IN ('active', 'escalated', 'resolved', 'archived'));

-- Add index for status queries
CREATE INDEX IF NOT EXISTS idx_chat_conversations_status 
ON public.chat_conversations(user_id, status, updated_at DESC);

-- Update existing conversations to have active status
UPDATE public.chat_conversations 
SET status = 'active' 
WHERE status IS NULL;
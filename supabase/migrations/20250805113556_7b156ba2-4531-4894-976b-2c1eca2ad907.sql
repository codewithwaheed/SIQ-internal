-- Enhanced chat tables with proper structure and security (without CONCURRENTLY)

-- First, ensure we have all required columns in chat_conversations
ALTER TABLE public.chat_conversations 
ADD COLUMN IF NOT EXISTS consultant_id uuid REFERENCES auth.users(id);

-- Update the existing status column constraint
ALTER TABLE public.chat_conversations 
DROP CONSTRAINT IF EXISTS chat_conversations_status_check;

ALTER TABLE public.chat_conversations 
ADD CONSTRAINT chat_conversations_status_check 
CHECK (status IN ('open', 'closed', 'escalated', 'resolved', 'active', 'archived'));

-- Ensure chat_messages has all required columns
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS sender_type text DEFAULT 'user' 
CHECK (sender_type IN ('user', 'assistant', 'consultant', 'system'));

ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS sender_id uuid REFERENCES auth.users(id);

-- Update role column to match sender_type for consistency
UPDATE public.chat_messages SET sender_type = role WHERE sender_type IS NULL;

-- Create optimized indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_conversations_user_status_created 
ON public.chat_conversations(user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_consultant_status 
ON public.chat_conversations(consultant_id, status, updated_at DESC) 
WHERE consultant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_conversation_timestamp_efficient 
ON public.chat_messages(conversation_id, timestamp ASC);

CREATE INDEX IF NOT EXISTS idx_messages_sender_type_timestamp 
ON public.chat_messages(conversation_id, sender_type, timestamp ASC);
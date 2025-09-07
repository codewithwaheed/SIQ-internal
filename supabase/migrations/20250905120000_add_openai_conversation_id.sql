-- Add column to link our conversations with OpenAI Conversations API
ALTER TABLE public.chat_conversations
ADD COLUMN IF NOT EXISTS openai_conversation_id text;

CREATE INDEX IF NOT EXISTS idx_chat_conversations_openai_conversation_id
  ON public.chat_conversations(openai_conversation_id);


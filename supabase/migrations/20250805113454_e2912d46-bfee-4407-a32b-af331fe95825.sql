-- Enhanced chat tables with proper structure and security

-- First, let's ensure we have all required columns in chat_conversations
ALTER TABLE public.chat_conversations 
ADD COLUMN IF NOT EXISTS consultant_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS status text DEFAULT 'open' 
CHECK (status IN ('open', 'closed', 'escalated', 'resolved'));

-- Update the existing status column constraint if it exists
ALTER TABLE public.chat_conversations 
DROP CONSTRAINT IF EXISTS chat_conversations_status_check;

ALTER TABLE public.chat_conversations 
ADD CONSTRAINT chat_conversations_status_check 
CHECK (status IN ('open', 'closed', 'escalated', 'resolved', 'active', 'archived'));

-- Ensure chat_messages has all required columns
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS sender_type text DEFAULT 'user' 
CHECK (sender_type IN ('user', 'assistant', 'consultant', 'system')),
ADD COLUMN IF NOT EXISTS sender_id uuid REFERENCES auth.users(id);

-- Update role column to match sender_type for consistency
UPDATE public.chat_messages SET sender_type = role WHERE sender_type IS NULL;

-- Create optimized indexes for efficient queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_user_status_created 
ON public.chat_conversations(user_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_consultant_status 
ON public.chat_conversations(consultant_id, status, updated_at DESC) 
WHERE consultant_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation_timestamp_efficient 
ON public.chat_messages(conversation_id, timestamp ASC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_sender_type_timestamp 
ON public.chat_messages(conversation_id, sender_type, timestamp ASC);

-- Create function for content sanitization
CREATE OR REPLACE FUNCTION public.sanitize_message_content(content text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Basic XSS prevention - remove common dangerous patterns
  content := regexp_replace(content, '<script[^>]*>.*?</script>', '', 'gi');
  content := regexp_replace(content, '<iframe[^>]*>.*?</iframe>', '', 'gi');
  content := regexp_replace(content, 'javascript:', '', 'gi');
  content := regexp_replace(content, 'vbscript:', '', 'gi');
  content := regexp_replace(content, 'onload=', '', 'gi');
  content := regexp_replace(content, 'onerror=', '', 'gi');
  content := regexp_replace(content, 'onclick=', '', 'gi');
  
  -- Limit content length
  IF length(content) > 10000 THEN
    content := left(content, 10000) || '... (truncated)';
  END IF;
  
  RETURN trim(content);
END;
$$;

-- Create function to check conversation access
CREATE OR REPLACE FUNCTION public.can_access_conversation(
  conversation_id uuid, 
  user_id uuid,
  user_role user_role DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  conv_record RECORD;
BEGIN
  -- Get conversation details
  SELECT c.user_id as conv_user_id, c.consultant_id, c.status, c.org_id
  INTO conv_record
  FROM public.chat_conversations c
  WHERE c.id = conversation_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check access rights
  IF conv_record.conv_user_id = user_id THEN
    RETURN true; -- Conversation owner
  END IF;
  
  IF conv_record.consultant_id = user_id THEN
    RETURN true; -- Assigned consultant
  END IF;
  
  IF user_role = 'admin' THEN
    RETURN true; -- Admin access
  END IF;
  
  IF user_role = 'consultant' AND conv_record.status = 'escalated' THEN
    RETURN true; -- Any consultant can access escalated conversations
  END IF;
  
  RETURN false;
END;
$$;

-- Create function to manage conversation state transitions
CREATE OR REPLACE FUNCTION public.update_conversation_status(
  conversation_id uuid,
  new_status text,
  user_id uuid,
  user_role user_role
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_status text;
  conv_user_id uuid;
BEGIN
  -- Get current conversation details
  SELECT status, user_id INTO current_status, conv_user_id
  FROM public.chat_conversations
  WHERE id = conversation_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation not found';
  END IF;
  
  -- Check permissions for status changes
  IF user_role NOT IN ('admin', 'consultant') AND conv_user_id != user_id THEN
    RAISE EXCEPTION 'Insufficient permissions to change conversation status';
  END IF;
  
  -- Validate status transitions
  IF current_status = 'closed' AND new_status != 'open' AND user_role != 'admin' THEN
    RAISE EXCEPTION 'Cannot change status of closed conversation';
  END IF;
  
  -- Update conversation status
  UPDATE public.chat_conversations 
  SET 
    status = new_status,
    updated_at = now(),
    consultant_id = CASE 
      WHEN new_status = 'escalated' AND consultant_id IS NULL AND user_role = 'consultant'
      THEN user_id
      ELSE consultant_id
    END
  WHERE id = conversation_id;
  
  -- Log the status change
  INSERT INTO public.audit_logs (
    action,
    description,
    user_id,
    metadata
  ) VALUES (
    'CONVERSATION_STATUS_CHANGED',
    'Conversation status changed from ' || current_status || ' to ' || new_status,
    user_id,
    jsonb_build_object(
      'conversation_id', conversation_id,
      'old_status', current_status,
      'new_status', new_status,
      'user_role', user_role
    )
  );
  
  RETURN true;
END;
$$;

-- Create function for async message processing tracking
CREATE TABLE IF NOT EXISTS public.message_processing_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  ai_response_id uuid REFERENCES public.chat_messages(id),
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone
);

-- Enable RLS on message processing queue
ALTER TABLE public.message_processing_queue ENABLE ROW LEVEL SECURITY;

-- RLS policy for message processing queue
CREATE POLICY "Users can view their own message processing" 
ON public.message_processing_queue 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.chat_conversations cc 
    WHERE cc.id = conversation_id AND cc.user_id = auth.uid()
  )
);

CREATE POLICY "Service can manage message processing" 
ON public.message_processing_queue 
FOR ALL 
USING (true);

-- Create indexes for message processing queue
CREATE INDEX idx_message_processing_status 
ON public.message_processing_queue(status, created_at);

CREATE INDEX idx_message_processing_conversation 
ON public.message_processing_queue(conversation_id, status);
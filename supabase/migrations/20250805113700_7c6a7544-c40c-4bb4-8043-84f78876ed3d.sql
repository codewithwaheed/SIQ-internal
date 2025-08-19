-- Create async message processing queue
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

-- Function to update conversation status with validation
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
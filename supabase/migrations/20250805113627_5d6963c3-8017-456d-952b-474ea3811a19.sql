-- Add security and utility functions

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
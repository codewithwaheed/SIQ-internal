-- Drop existing function and recreate with enhanced security
DROP FUNCTION IF EXISTS public.detect_suspicious_activity();

-- Recreate with enhanced return type
CREATE OR REPLACE FUNCTION public.detect_suspicious_activity()
RETURNS TABLE(
  alert_type text, 
  description text, 
  user_id uuid, 
  metadata jsonb, 
  created_at timestamp with time zone,
  severity_level text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Only admins can run this
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Only administrators can check suspicious activity';
  END IF;
  
  RETURN QUERY
  -- Failed login attempts
  SELECT 
    'MULTIPLE_FAILED_LOGINS'::text,
    'Multiple failed login attempts detected from same source'::text,
    al.user_id,
    jsonb_build_object(
      'ip_address', al.ip_address,
      'attempt_count', COUNT(*),
      'time_window', '1 hour'
    ),
    MAX(al.created_at),
    'HIGH'::text
  FROM public.audit_logs al
  WHERE al.action = 'FAILED_LOGIN'
    AND al.created_at > now() - interval '1 hour'
  GROUP BY al.ip_address, al.user_id
  HAVING COUNT(*) >= 5
  
  UNION ALL
  
  -- Rapid role changes
  SELECT 
    'RAPID_ROLE_CHANGES'::text,
    'Suspicious rapid role changes detected'::text,
    al.user_id,
    jsonb_build_object(
      'change_count', COUNT(*),
      'time_window', '1 hour'
    ),
    MAX(al.created_at),
    'CRITICAL'::text
  FROM public.audit_logs al
  WHERE al.action = 'ROLE_CHANGE_ENHANCED'
    AND al.created_at > now() - interval '1 hour'
  GROUP BY al.user_id
  HAVING COUNT(*) >= 3
  
  UNION ALL
  
  -- Unusual file upload patterns
  SELECT 
    'BULK_FILE_UPLOADS'::text,
    'Unusual bulk file upload activity detected'::text,
    al.user_id,
    jsonb_build_object(
      'upload_count', COUNT(*),
      'time_window', '30 minutes'
    ),
    MAX(al.created_at),
    'MEDIUM'::text
  FROM public.audit_logs al
  WHERE al.action = 'FILE_UPLOAD_VALIDATION'
    AND al.created_at > now() - interval '30 minutes'
  GROUP BY al.user_id
  HAVING COUNT(*) >= 10;
END;
$function$;

-- Create a secure session management table
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  user_id uuid,
  ip_address inet,
  user_agent text,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}',
  resolved boolean DEFAULT false,
  resolved_by uuid,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on security events
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Create policies for security events
DROP POLICY IF EXISTS "Admins can manage security events" ON public.security_events;
CREATE POLICY "Admins can manage security events" 
ON public.security_events 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "System can insert security events" ON public.security_events;
CREATE POLICY "System can insert security events" 
ON public.security_events 
FOR INSERT 
WITH CHECK (true);

-- Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text,
  p_severity text,
  p_description text,
  p_user_id uuid DEFAULT NULL,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  event_id uuid;
BEGIN
  INSERT INTO public.security_events (
    event_type,
    severity,
    user_id,
    ip_address,
    user_agent,
    description,
    metadata
  ) VALUES (
    p_event_type,
    p_severity,
    COALESCE(p_user_id, auth.uid()),
    p_ip_address,
    p_user_agent,
    p_description,
    p_metadata
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$function$;
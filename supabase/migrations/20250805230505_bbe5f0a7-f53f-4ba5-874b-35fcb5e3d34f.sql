-- Fix database security issues identified by linter

-- 1. Set proper search path for security definer functions
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT org_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- 2. Create improved security settings for OTP and password protection
UPDATE auth.config SET 
  otp_expiry = 900, -- 15 minutes instead of default 1 hour
  enable_signup = true,
  site_url = 'https://your-domain.com';

-- 3. Add additional security monitoring triggers
CREATE OR REPLACE FUNCTION public.log_sensitive_operation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log sensitive operations like role changes, data access, etc.
  INSERT INTO public.audit_logs (
    user_id,
    action,
    description,
    metadata,
    created_at
  ) VALUES (
    auth.uid(),
    'SENSITIVE_OPERATION',
    'Sensitive operation performed on ' || TG_TABLE_NAME,
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'record_id', COALESCE(NEW.id, OLD.id),
      'timestamp', now()
    ),
    now()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4. Add trigger for monitoring user role changes
CREATE TRIGGER sensitive_operation_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_operation();

-- 5. Create function to validate security settings
CREATE OR REPLACE FUNCTION public.validate_security_configuration()
RETURNS TABLE(
  check_name text,
  status text,
  message text,
  severity text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check RLS is enabled on critical tables
  RETURN QUERY
  SELECT 
    'RLS_ENABLED'::text,
    CASE WHEN relrowsecurity THEN 'PASS' ELSE 'FAIL' END::text,
    'Row Level Security status for ' || relname::text,
    CASE WHEN relrowsecurity THEN 'INFO' ELSE 'CRITICAL' END::text
  FROM pg_class 
  WHERE relname IN ('profiles', 'escalations', 'documents', 'chat_conversations')
    AND relkind = 'r';
    
  -- Check for tables without proper policies
  RETURN QUERY
  SELECT 
    'POLICY_COUNT'::text,
    CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END::text,
    'Policy count for ' || tablename::text || ': ' || COUNT(*)::text,
    CASE WHEN COUNT(*) > 0 THEN 'INFO' ELSE 'HIGH' END::text
  FROM pg_policies 
  WHERE tablename IN ('profiles', 'escalations', 'documents', 'chat_conversations')
  GROUP BY tablename;
END;
$$;

-- 6. Enhanced rate limiting function
CREATE OR REPLACE FUNCTION public.check_enhanced_rate_limit(
  identifier text,
  action_type text,
  max_attempts integer DEFAULT 10,
  window_minutes integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  attempt_count integer;
  window_start timestamp with time zone;
BEGIN
  window_start := now() - (window_minutes || ' minutes')::interval;
  
  -- Count recent attempts
  SELECT COUNT(*) INTO attempt_count
  FROM public.auth_rate_limits
  WHERE ip_address = identifier::inet
    AND attempt_type = action_type
    AND attempted_at > window_start;
  
  -- Log this attempt
  INSERT INTO public.auth_rate_limits (
    ip_address,
    attempt_type,
    attempted_at,
    success
  ) VALUES (
    identifier::inet,
    action_type,
    now(),
    attempt_count < max_attempts
  );
  
  -- Return whether request is allowed
  RETURN attempt_count < max_attempts;
END;
$$;
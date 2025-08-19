-- Security Hardening Migration: Fix Linter Issues and Enhance Security
-- This migration addresses all identified security concerns

-- 1. Fix Function Search Path Mutable (Issues 2-5)
-- Set immutable search paths on all security functions to prevent SQL injection

-- Update existing functions with proper search_path
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
 RETURNS user_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_org_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT org_id
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
$function$;

-- 2. Enhanced Security Monitoring Functions
-- Create security event tracking with proper search paths

CREATE OR REPLACE FUNCTION public.log_security_violation(
  violation_type text,
  user_id_param uuid DEFAULT NULL,
  ip_address_param inet DEFAULT NULL,
  metadata_param jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.audit_logs (
    action,
    description,
    user_id,
    ip_address,
    metadata
  ) VALUES (
    'SECURITY_VIOLATION',
    violation_type,
    COALESCE(user_id_param, auth.uid()),
    ip_address_param,
    metadata_param || jsonb_build_object(
      'violation_timestamp', now(),
      'session_id', COALESCE(current_setting('request.header.x-session-id', true), 'unknown')
    )
  );
END;
$function$;

-- 3. Enhanced Rate Limiting Function
CREATE OR REPLACE FUNCTION public.check_rate_limit_enhanced(
  identifier text,
  max_requests integer,
  window_minutes integer,
  block_minutes integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  request_count integer;
  is_blocked boolean;
BEGIN
  -- Check if identifier is currently blocked
  SELECT EXISTS(
    SELECT 1 FROM public.auth_rate_limits 
    WHERE ip_address = identifier::inet 
    AND attempted_at > now() - (block_minutes || ' minutes')::interval
    AND attempt_type = 'BLOCKED'
  ) INTO is_blocked;
  
  IF is_blocked THEN
    RETURN false;
  END IF;
  
  -- Count recent requests
  SELECT COUNT(*) INTO request_count
  FROM public.auth_rate_limits
  WHERE ip_address = identifier::inet
  AND attempted_at > now() - (window_minutes || ' minutes')::interval
  AND success = true;
  
  -- Check if limit exceeded
  IF request_count >= max_requests THEN
    -- Log rate limit violation and block
    INSERT INTO public.auth_rate_limits (
      ip_address,
      attempt_type,
      success,
      user_agent
    ) VALUES (
      identifier::inet,
      'BLOCKED',
      false,
      'Rate limit exceeded'
    );
    
    -- Log security violation
    PERFORM public.log_security_violation(
      'RATE_LIMIT_EXCEEDED',
      auth.uid(),
      identifier::inet,
      jsonb_build_object(
        'requests_in_window', request_count,
        'max_allowed', max_requests,
        'window_minutes', window_minutes
      )
    );
    
    RETURN false;
  END IF;
  
  RETURN true;
END;
$function$;

-- 4. Database Security Configuration Validation
CREATE OR REPLACE FUNCTION public.validate_security_config()
RETURNS TABLE(check_name text, status text, recommendation text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only admins can run security validation
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required for security validation';
  END IF;
  
  RETURN QUERY
  -- Check RLS is enabled on all user tables
  SELECT 
    'RLS_ENABLED_' || schemaname || '_' || tablename,
    CASE WHEN rowsecurity THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN rowsecurity THEN 'RLS is properly enabled' 
         ELSE 'Enable RLS: ALTER TABLE ' || schemaname || '.' || tablename || ' ENABLE ROW LEVEL SECURITY;' END
  FROM pg_tables pt
  JOIN pg_class pc ON pc.relname = pt.tablename
  WHERE pt.schemaname = 'public'
  AND pt.tablename NOT LIKE 'pg_%'
  AND pt.tablename NOT IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns');
END;
$function$;

-- 5. Automated Security Monitoring Triggers
-- Create trigger for sensitive table monitoring

CREATE OR REPLACE FUNCTION public.monitor_sensitive_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  table_name text := TG_TABLE_NAME;
  operation text := TG_OP;
  user_id_val uuid := auth.uid();
BEGIN
  -- Log all changes to sensitive tables
  INSERT INTO public.audit_logs (
    action,
    description,
    user_id,
    metadata
  ) VALUES (
    'SENSITIVE_TABLE_CHANGE',
    operation || ' operation on ' || table_name,
    user_id_val,
    jsonb_build_object(
      'table_name', table_name,
      'operation', operation,
      'timestamp', now(),
      'record_id', COALESCE(NEW.id, OLD.id)
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Apply monitoring triggers to sensitive tables
DROP TRIGGER IF EXISTS monitor_user_roles_changes ON public.user_roles;
CREATE TRIGGER monitor_user_roles_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.monitor_sensitive_changes();

DROP TRIGGER IF EXISTS monitor_consultant_profiles_changes ON public.consultant_profiles;
CREATE TRIGGER monitor_consultant_profiles_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.consultant_profiles
  FOR EACH ROW EXECUTE FUNCTION public.monitor_sensitive_changes();

-- 6. Enhanced Password Validation
CREATE OR REPLACE FUNCTION public.validate_password_strength_enhanced(password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb := '{"valid": false, "errors": []}'::jsonb;
  errors text[] := ARRAY[]::text[];
BEGIN
  -- Check minimum length (increased to 14)
  IF length(password) < 14 THEN
    errors := array_append(errors, 'Password must be at least 14 characters long');
  END IF;
  
  -- Check for uppercase
  IF password !~ '[A-Z]' THEN
    errors := array_append(errors, 'Password must contain at least one uppercase letter');
  END IF;
  
  -- Check for lowercase  
  IF password !~ '[a-z]' THEN
    errors := array_append(errors, 'Password must contain at least one lowercase letter');
  END IF;
  
  -- Check for numbers
  IF password !~ '[0-9]' THEN
    errors := array_append(errors, 'Password must contain at least one number');
  END IF;
  
  -- Check for special characters
  IF password !~ '[!@#$%^&*()_+\-=\[\]{};:"\\|,.<>\?]' THEN
    errors := array_append(errors, 'Password must contain at least one special character');
  END IF;
  
  -- Check for common patterns
  IF password ~* '(password|123456|qwerty|admin|login)' THEN
    errors := array_append(errors, 'Password contains common unsafe patterns');
  END IF;
  
  -- Build result
  result := jsonb_build_object(
    'valid', array_length(errors, 1) IS NULL,
    'errors', to_jsonb(errors),
    'strength_score', CASE 
      WHEN array_length(errors, 1) IS NULL THEN 100
      WHEN array_length(errors, 1) <= 2 THEN 75
      WHEN array_length(errors, 1) <= 4 THEN 50
      ELSE 25
    END
  );
  
  RETURN result;
END;
$function$;

-- 7. Security Settings Management
CREATE TABLE IF NOT EXISTS public.security_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_name text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS on security settings
ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage security settings
CREATE POLICY "Only admins can manage security settings" ON public.security_settings
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Insert default security settings
INSERT INTO public.security_settings (setting_name, setting_value, description) VALUES
('max_login_attempts', '5', 'Maximum login attempts before account lockout'),
('lockout_duration_minutes', '30', 'Account lockout duration in minutes'),
('session_timeout_hours', '8', 'Session timeout in hours'),
('password_min_length', '14', 'Minimum password length'),
('require_mfa_for_admins', 'true', 'Require MFA for admin accounts'),
('audit_retention_days', '90', 'Audit log retention period in days')
ON CONFLICT (setting_name) DO NOTHING;

-- 8. Create Security Events Table for Enhanced Monitoring
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  user_id uuid REFERENCES auth.users(id),
  ip_address inet,
  user_agent text,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on security events
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Security events policies
CREATE POLICY "Admins can view all security events" ON public.security_events
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service can insert security events" ON public.security_events
FOR INSERT WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON public.security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON public.security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON public.security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON public.security_events(user_id);

-- 9. Update existing functions to use security settings
CREATE OR REPLACE FUNCTION public.get_security_setting(setting_name text)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT setting_value
  FROM public.security_settings
  WHERE security_settings.setting_name = get_security_setting.setting_name;
$function$;
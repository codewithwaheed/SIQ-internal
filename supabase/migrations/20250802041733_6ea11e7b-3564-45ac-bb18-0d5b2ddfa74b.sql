-- Security Fix: Create function to setup initial admin user
CREATE OR REPLACE FUNCTION setup_initial_admin(admin_email text, admin_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_user_id uuid;
  existing_admin_count integer;
BEGIN
  -- Check if any admin already exists
  SELECT COUNT(*) INTO existing_admin_count
  FROM public.user_roles
  WHERE role = 'admin';
  
  -- Only allow if no admin exists yet
  IF existing_admin_count > 0 THEN
    RAISE EXCEPTION 'Admin user already exists. Cannot create additional admin via this function.';
  END IF;
  
  -- Get the user ID for the provided email
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = admin_email
  LIMIT 1;
  
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found. Please ensure the user has signed up first.', admin_email;
  END IF;
  
  -- Assign admin role
  INSERT INTO public.user_roles (user_id, role, self_selected, assigned_by)
  VALUES (admin_user_id, 'admin', false, admin_user_id)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Log the admin creation
  INSERT INTO public.audit_logs (
    user_id,
    action,
    description,
    metadata
  ) VALUES (
    admin_user_id,
    'ADMIN_CREATED',
    'Initial admin user created',
    jsonb_build_object(
      'email', admin_email,
      'created_at', now(),
      'method', 'setup_function'
    )
  );
  
  RETURN true;
END;
$$;

-- Create security settings table for system-wide security configuration
CREATE TABLE IF NOT EXISTS public.security_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_name text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS on security settings
ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage security settings
CREATE POLICY "Admins can manage security settings"
ON public.security_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Insert default security settings
INSERT INTO public.security_settings (setting_name, setting_value, description) VALUES
('rate_limit_api', '{"max_requests": 100, "window_ms": 60000}', 'API rate limiting configuration'),
('rate_limit_upload', '{"max_requests": 10, "window_ms": 60000}', 'File upload rate limiting'),
('rate_limit_escalation', '{"max_requests": 5, "window_ms": 300000}', 'Escalation request rate limiting'),
('password_policy', '{"min_length": 12, "require_uppercase": true, "require_lowercase": true, "require_numbers": true, "require_symbols": false}', 'Password strength requirements'),
('session_timeout', '{"timeout_ms": 3600000}', 'Session timeout in milliseconds'),
('failed_login_lockout', '{"max_attempts": 5, "lockout_duration_ms": 900000}', 'Failed login attempt lockout policy')
ON CONFLICT (setting_name) DO NOTHING;

-- Create trigger for updating updated_at
CREATE TRIGGER update_security_settings_updated_at
  BEFORE UPDATE ON public.security_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get security setting
CREATE OR REPLACE FUNCTION get_security_setting(setting_name text)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT setting_value
  FROM public.security_settings
  WHERE security_settings.setting_name = get_security_setting.setting_name;
$$;

-- Create improved audit log cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(retention_days integer DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Only admins can run this
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only administrators can clean up audit logs';
  END IF;
  
  -- Delete old audit logs
  DELETE FROM public.audit_logs
  WHERE created_at < (now() - (retention_days || ' days')::interval);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the cleanup
  INSERT INTO public.audit_logs (
    user_id,
    action,
    description,
    metadata
  ) VALUES (
    auth.uid(),
    'AUDIT_LOG_CLEANUP',
    'Cleaned up old audit logs',
    jsonb_build_object(
      'retention_days', retention_days,
      'deleted_count', deleted_count,
      'cleanup_timestamp', now()
    )
  );
  
  RETURN deleted_count;
END;
$$;

-- Create function to detect and block suspicious IP addresses
CREATE OR REPLACE FUNCTION block_suspicious_ip(ip_address inet, reason text DEFAULT 'Suspicious activity detected')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only admins and system can block IPs
  IF NOT (has_role(auth.uid(), 'admin') OR auth.uid() IS NULL) THEN
    RAISE EXCEPTION 'Insufficient permissions to block IP addresses';
  END IF;
  
  -- Create or update blocked IP entry (you would need to create this table)
  -- For now, just log it
  INSERT INTO public.audit_logs (
    user_id,
    action,
    description,
    metadata,
    ip_address
  ) VALUES (
    auth.uid(),
    'IP_BLOCKED',
    reason,
    jsonb_build_object(
      'blocked_ip', ip_address,
      'blocked_at', now(),
      'blocked_by', COALESCE(auth.uid()::text, 'system')
    ),
    ip_address
  );
END;
$$;
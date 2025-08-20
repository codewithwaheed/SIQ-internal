-- Fix critical security issues identified in the linter

-- 1. Add explicit search_path settings to all security definer functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
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
SET search_path = 'public'
AS $function$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1;
$function$;

-- 2. Enhance password validation with additional security checks
CREATE OR REPLACE FUNCTION public.validate_password_strength(password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Check minimum length (increased to 14 characters)
  IF length(password) < 14 THEN
    RETURN false;
  END IF;
  
  -- Check for uppercase
  IF password !~ '[A-Z]' THEN
    RETURN false;
  END IF;
  
  -- Check for lowercase  
  IF password !~ '[a-z]' THEN
    RETURN false;
  END IF;
  
  -- Check for numbers
  IF password !~ '[0-9]' THEN
    RETURN false;
  END IF;
  
  -- Check for special characters
  IF password !~ '[!@#$%^&*(),.?":{}|<>]' THEN
    RETURN false;
  END IF;
  
  -- Check for common patterns (basic check)
  IF password ~* '(password|123456|qwerty|admin|user)' THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$function$;

-- 3. Enhanced file upload validation with better magic byte checking
CREATE OR REPLACE FUNCTION public.validate_file_upload(
  file_name text, 
  file_size integer, 
  file_type text, 
  magic_bytes text DEFAULT NULL::text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  max_file_size integer := 25 * 1024 * 1024; -- Reduced to 25MB for security
  allowed_types text[] := ARRAY[
    'application/pdf', 
    'text/plain', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
    'application/msword',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  magic_byte_patterns jsonb := '{
    "application/pdf": ["25504446", "%PDF"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["504B0304", "504B0506", "504B0708"],
    "application/msword": ["D0CF11E0", "0D444F43"],
    "text/plain": ["UTF-8", "ASCII"],
    "application/vnd.ms-excel": ["D0CF11E0"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["504B0304", "504B0506"]
  }'::jsonb;
  allowed_patterns jsonb;
  pattern text;
BEGIN
  -- Validate file name for suspicious patterns
  IF file_name ~* '\.(exe|bat|cmd|scr|vbs|js|jar|com|pif)$' THEN
    RAISE EXCEPTION 'File type potentially dangerous: %', file_name;
  END IF;
  
  -- Check file size
  IF file_size <= 0 OR file_size > max_file_size THEN
    RAISE EXCEPTION 'File size invalid or exceeds maximum allowed (25MB)';
  END IF;
  
  -- Check file type
  IF NOT (file_type = ANY(allowed_types)) THEN
    RAISE EXCEPTION 'File type not allowed: %', file_type;
  END IF;
  
  -- Enhanced magic bytes validation
  IF magic_bytes IS NOT NULL AND magic_byte_patterns ? file_type THEN
    allowed_patterns := magic_byte_patterns->file_type;
    
    -- Check if any of the allowed patterns match
    FOR pattern IN SELECT jsonb_array_elements_text(allowed_patterns) LOOP
      IF magic_bytes ILIKE pattern || '%' THEN
        -- Valid magic bytes found, continue with logging
        INSERT INTO public.audit_logs (
          action,
          description,
          user_id,
          metadata
        ) VALUES (
          'FILE_UPLOAD_VALIDATION',
          'File upload validated: ' || file_name,
          auth.uid(),
          jsonb_build_object(
            'file_name', file_name,
            'file_size', file_size,
            'file_type', file_type,
            'magic_bytes_verified', true,
            'validation_result', 'PASSED',
            'security_level', 'HIGH'
          )
        );
        RETURN true;
      END IF;
    END LOOP;
    
    -- No valid magic bytes found
    RAISE EXCEPTION 'File content validation failed: magic bytes do not match file type';
  END IF;
  
  -- Log successful validation
  INSERT INTO public.audit_logs (
    action,
    description,
    user_id,
    metadata
  ) VALUES (
    'FILE_UPLOAD_VALIDATION',
    'File upload validated: ' || file_name,
    auth.uid(),
    jsonb_build_object(
      'file_name', file_name,
      'file_size', file_size,
      'file_type', file_type,
      'magic_bytes_checked', magic_bytes IS NOT NULL,
      'validation_result', 'PASSED'
    )
  );
  
  RETURN true;
END;
$function$;

-- 4. Enhanced role change security with additional validation
CREATE OR REPLACE FUNCTION public.can_update_role_enhanced(target_user_id uuid, new_role user_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  current_user_role user_role;
  target_current_role user_role;
  admin_count INTEGER;
  recent_role_changes INTEGER;
BEGIN
  -- Get current user's role
  SELECT role INTO current_user_role
  FROM public.user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  -- Get target user's current role
  SELECT role INTO target_current_role
  FROM public.user_roles
  WHERE user_id = target_user_id
  LIMIT 1;
  
  -- Only admins can update roles
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Insufficient permissions: Only administrators can modify roles';
  END IF;
  
  -- Check for suspicious rapid role changes
  SELECT COUNT(*) INTO recent_role_changes
  FROM public.audit_logs
  WHERE action = 'ROLE_CHANGE_ENHANCED'
    AND user_id = auth.uid()
    AND created_at > now() - interval '1 hour';
    
  IF recent_role_changes >= 3 THEN
    RAISE EXCEPTION 'Rate limit exceeded: Too many role changes in the last hour';
  END IF;
  
  -- Prevent self-demotion (admin removing their own admin role)
  IF target_user_id = auth.uid() AND current_user_role = 'admin' AND new_role != 'admin' THEN
    -- Check if this would leave no admins
    SELECT COUNT(*) INTO admin_count
    FROM public.user_roles
    WHERE role = 'admin' AND user_id != auth.uid();
    
    IF admin_count = 0 THEN
      RAISE EXCEPTION 'Security violation: Cannot remove last admin user';
    END IF;
  END IF;
  
  -- Prevent admin privilege escalation beyond reasonable limits
  IF new_role = 'admin' THEN
    SELECT COUNT(*) INTO admin_count
    FROM public.user_roles
    WHERE role = 'admin';
    
    -- Limit maximum admins to 3 for better security
    IF admin_count >= 3 AND target_current_role != 'admin' THEN
      RAISE EXCEPTION 'Security limit: Maximum admin limit reached (3)';
    END IF;
  END IF;
  
  -- Only allow valid role transitions
  IF new_role NOT IN ('business_owner', 'consultant', 'admin') THEN
    RAISE EXCEPTION 'Invalid role: % is not a valid role', new_role;
  END IF;
  
  RETURN true;
END;
$function$;

-- 5. Enhanced security monitoring function
DROP FUNCTION IF EXISTS public.detect_suspicious_activity();
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

-- 6. Create a secure session management table
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
CREATE POLICY "Admins can manage security events" 
ON public.security_events 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert security events" 
ON public.security_events 
FOR INSERT 
WITH CHECK (true);

-- 7. Create function to log security events
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
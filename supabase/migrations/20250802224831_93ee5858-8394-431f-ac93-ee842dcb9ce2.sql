-- Security Enhancement: Database Configuration Fixes

-- 1. Create enhanced role management functions with admin privilege escalation prevention
CREATE OR REPLACE FUNCTION public.can_update_role_enhanced(target_user_id uuid, new_role user_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_role user_role;
  target_current_role user_role;
  admin_count INTEGER;
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
    RETURN false;
  END IF;
  
  -- Prevent self-demotion (admin removing their own admin role)
  IF target_user_id = auth.uid() AND current_user_role = 'admin' AND new_role != 'admin' THEN
    -- Check if this would leave no admins
    SELECT COUNT(*) INTO admin_count
    FROM public.user_roles
    WHERE role = 'admin' AND user_id != auth.uid();
    
    IF admin_count = 0 THEN
      RAISE EXCEPTION 'Cannot remove last admin user';
    END IF;
  END IF;
  
  -- Prevent admin privilege escalation beyond reasonable limits
  IF new_role = 'admin' THEN
    SELECT COUNT(*) INTO admin_count
    FROM public.user_roles
    WHERE role = 'admin';
    
    -- Limit maximum admins to 5
    IF admin_count >= 5 AND target_current_role != 'admin' THEN
      RAISE EXCEPTION 'Maximum admin limit reached (5)';
    END IF;
  END IF;
  
  -- Only allow valid role transitions
  IF new_role NOT IN ('business_owner', 'consultant', 'admin') THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- 2. Enhanced audit logging for role changes
CREATE OR REPLACE FUNCTION public.log_role_change_enhanced()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_count INTEGER;
  target_profile RECORD;
BEGIN
  -- Get target user profile info for detailed logging
  SELECT email, first_name, last_name INTO target_profile
  FROM public.profiles
  WHERE user_id = NEW.user_id
  LIMIT 1;
  
  -- Count current admins for security monitoring
  SELECT COUNT(*) INTO admin_count
  FROM public.user_roles
  WHERE role = 'admin';
  
  INSERT INTO public.audit_logs (
    action,
    description,
    user_id,
    metadata,
    ip_address
  ) VALUES (
    'ROLE_CHANGE_ENHANCED',
    'User role changed from ' || COALESCE(OLD.role::text, 'none') || ' to ' || NEW.role::text || ' for ' || COALESCE(target_profile.email, 'unknown'),
    auth.uid(),
    jsonb_build_object(
      'target_user_id', NEW.user_id,
      'target_email', target_profile.email,
      'target_name', COALESCE(target_profile.first_name || ' ' || target_profile.last_name, 'Unknown'),
      'old_role', OLD.role,
      'new_role', NEW.role,
      'admin_count', admin_count,
      'timestamp', now(),
      'assigned_by', auth.uid(),
      'security_level', 'HIGH'
    ),
    inet '127.0.0.1' -- Placeholder, will be updated by edge functions
  );
  
  -- Alert on admin role changes
  IF NEW.role = 'admin' OR (OLD.role IS NOT NULL AND OLD.role = 'admin') THEN
    INSERT INTO public.audit_logs (
      action,
      description,
      user_id,
      metadata
    ) VALUES (
      'ADMIN_ROLE_ALERT',
      'SECURITY ALERT: Admin role modification detected',
      auth.uid(),
      jsonb_build_object(
        'alert_type', 'ADMIN_ROLE_CHANGE',
        'target_user_id', NEW.user_id,
        'severity', 'CRITICAL',
        'requires_review', true,
        'timestamp', now()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Create document access logging function
CREATE OR REPLACE FUNCTION public.log_document_access(
  document_id uuid,
  access_type text,
  user_ip inet DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  doc_info RECORD;
BEGIN
  -- Get document info for logging
  SELECT file_name, file_type, user_id as owner_id INTO doc_info
  FROM public.documents
  WHERE id = document_id
  LIMIT 1;
  
  IF doc_info IS NULL THEN
    RAISE EXCEPTION 'Document not found for access logging';
  END IF;
  
  INSERT INTO public.audit_logs (
    action,
    description,
    user_id,
    metadata,
    ip_address
  ) VALUES (
    'DOCUMENT_ACCESS',
    'Document ' || access_type || ': ' || doc_info.file_name,
    auth.uid(),
    jsonb_build_object(
      'document_id', document_id,
      'access_type', access_type,
      'file_name', doc_info.file_name,
      'file_type', doc_info.file_type,
      'document_owner', doc_info.owner_id,
      'accessed_by', auth.uid(),
      'timestamp', now(),
      'security_level', 'MEDIUM'
    ),
    COALESCE(user_ip, inet '127.0.0.1')
  );
END;
$$;

-- 4. Update the role change trigger to use enhanced function
DROP TRIGGER IF EXISTS update_role_audit ON public.user_roles;
CREATE TRIGGER update_role_audit
  AFTER INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_role_change_enhanced();

-- 5. Create function to monitor suspicious activities
CREATE OR REPLACE FUNCTION public.detect_suspicious_activity()
RETURNS TABLE(
  alert_type text,
  description text,
  user_id uuid,
  metadata jsonb,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only admins can run this
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only administrators can check suspicious activity';
  END IF;
  
  RETURN QUERY
  SELECT 
    'MULTIPLE_FAILED_LOGINS'::text,
    'Multiple failed login attempts detected'::text,
    al.user_id,
    al.metadata,
    al.created_at
  FROM public.audit_logs al
  WHERE al.action = 'FAILED_LOGIN'
    AND al.created_at > now() - interval '1 hour'
  GROUP BY al.ip_address, al.user_id, al.metadata, al.created_at
  HAVING COUNT(*) >= 5
  
  UNION ALL
  
  SELECT 
    'RAPID_ROLE_CHANGES'::text,
    'Rapid role changes detected'::text,
    al.user_id,
    al.metadata,
    al.created_at
  FROM public.audit_logs al
  WHERE al.action = 'ROLE_CHANGE_ENHANCED'
    AND al.created_at > now() - interval '1 hour'
  GROUP BY al.user_id, al.metadata, al.created_at
  HAVING COUNT(*) >= 3;
END;
$$;

-- 6. Create function for secure file upload validation
CREATE OR REPLACE FUNCTION public.validate_file_upload(
  file_name text,
  file_size integer,
  file_type text,
  magic_bytes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  max_file_size integer := 50 * 1024 * 1024; -- 50MB
  allowed_types text[] := ARRAY['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
  magic_byte_map jsonb := '{
    "application/pdf": "25504446",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "504B0304",
    "application/msword": "D0CF11E0"
  }'::jsonb;
BEGIN
  -- Check file size
  IF file_size > max_file_size THEN
    RAISE EXCEPTION 'File size exceeds maximum allowed (50MB)';
  END IF;
  
  -- Check file type
  IF NOT (file_type = ANY(allowed_types)) THEN
    RAISE EXCEPTION 'File type not allowed: %', file_type;
  END IF;
  
  -- Validate magic bytes if provided
  IF magic_bytes IS NOT NULL THEN
    IF NOT (magic_byte_map->file_type IS NOT NULL AND magic_bytes LIKE (magic_byte_map->>file_type) || '%') THEN
      RAISE EXCEPTION 'File content does not match declared type';
    END IF;
  END IF;
  
  -- Log the validation
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
$$;
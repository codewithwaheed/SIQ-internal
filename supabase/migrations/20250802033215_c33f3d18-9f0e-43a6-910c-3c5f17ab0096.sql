-- Fix Critical Role Escalation Vulnerability
-- 1. Remove dangerous UPDATE policies that allow role escalation
DROP POLICY IF EXISTS "Prevent role escalation" ON public.user_roles;
DROP POLICY IF EXISTS "update_own_subscription" ON public.subscribers;

-- 2. Create secure role validation function
CREATE OR REPLACE FUNCTION public.can_update_role(
  target_user_id uuid,
  new_role user_role
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_role user_role;
  target_current_role user_role;
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
    RETURN false;
  END IF;
  
  -- Only allow valid role transitions
  IF new_role NOT IN ('business_owner', 'consultant', 'admin') THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- 3. Create secure role update policies
CREATE POLICY "Secure role updates"
ON public.user_roles
FOR UPDATE
USING (public.can_update_role(user_id, role))
WITH CHECK (public.can_update_role(user_id, role));

-- 4. Fix subscribers table policy
CREATE POLICY "Users can update own subscription only"
ON public.subscribers
FOR UPDATE
USING (user_id = auth.uid() OR email = auth.email())
WITH CHECK (user_id = auth.uid() OR email = auth.email());

-- 5. Add audit logging for role changes
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    action,
    description,
    user_id,
    metadata
  ) VALUES (
    'role_change',
    'User role changed from ' || COALESCE(OLD.role::text, 'none') || ' to ' || NEW.role::text,
    auth.uid(),
    jsonb_build_object(
      'target_user_id', NEW.user_id,
      'old_role', OLD.role,
      'new_role', NEW.role,
      'timestamp', now()
    )
  );
  RETURN NEW;
END;
$$;

-- 6. Create trigger for role change logging
DROP TRIGGER IF EXISTS audit_role_changes ON public.user_roles;
CREATE TRIGGER audit_role_changes
  AFTER UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_role_change();

-- 7. Add constraints to prevent invalid states
ALTER TABLE public.user_roles 
ADD CONSTRAINT valid_role_check 
CHECK (role IN ('business_owner', 'consultant', 'admin'));

-- 8. Ensure user_id is not nullable (security requirement)
ALTER TABLE public.user_roles 
ALTER COLUMN user_id SET NOT NULL;

-- 9. Add unique constraint to prevent duplicate roles per user
ALTER TABLE public.user_roles 
DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);
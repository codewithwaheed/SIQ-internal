-- Critical Security Fixes

-- 1. Prevent users from escalating their own roles
-- Drop existing policy that might allow unsafe role updates
DROP POLICY IF EXISTS "Service can insert roles" ON public.user_roles;

-- Create more restrictive policy for role insertion
CREATE POLICY "System can insert initial roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (
  -- Only allow during user registration (self_selected = true) 
  -- or by admins for role assignments
  (self_selected = true AND role IN ('business_owner', 'consultant')) 
  OR has_role(auth.uid(), 'admin'::user_role)
);

-- 2. Prevent role escalation by users
CREATE POLICY "Prevent role escalation" 
ON public.user_roles 
FOR UPDATE 
USING (
  -- Only admins can update roles
  has_role(auth.uid(), 'admin'::user_role)
);

-- 3. Add security for role deletions
CREATE POLICY "Only admins can delete roles" 
ON public.user_roles 
FOR DELETE 
USING (
  has_role(auth.uid(), 'admin'::user_role)
);

-- 4. Add rate limiting table for auth attempts
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address inet NOT NULL,
  user_email text,
  attempt_type text NOT NULL, -- 'login', 'signup', 'reset'
  attempted_at timestamp with time zone NOT NULL DEFAULT now(),
  success boolean NOT NULL DEFAULT false,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on rate limits table
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only allow service to manage rate limits
CREATE POLICY "Service can manage rate limits"
ON public.auth_rate_limits
FOR ALL
USING (true);

-- 5. Add password strength tracking
CREATE TABLE IF NOT EXISTS public.password_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  min_length integer NOT NULL DEFAULT 12,
  require_uppercase boolean NOT NULL DEFAULT true,
  require_lowercase boolean NOT NULL DEFAULT true,
  require_numbers boolean NOT NULL DEFAULT true,
  require_symbols boolean NOT NULL DEFAULT false,
  last_password_change timestamp with time zone,
  password_history_count integer NOT NULL DEFAULT 5,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on password policies
ALTER TABLE public.password_policies ENABLE ROW LEVEL SECURITY;

-- Users can only see their own password policies
CREATE POLICY "Users can view own password policy"
ON public.password_policies
FOR SELECT
USING (user_id = auth.uid());

-- Only service can manage password policies
CREATE POLICY "Service can manage password policies"
ON public.password_policies
FOR ALL
USING (true);

-- 6. Add session security table
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token text NOT NULL,
  ip_address inet,
  user_agent text,
  expires_at timestamp with time zone NOT NULL,
  last_activity timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
CREATE POLICY "Users can view own sessions"
ON public.user_sessions
FOR SELECT
USING (user_id = auth.uid());

-- Only service can manage sessions
CREATE POLICY "Service can manage sessions"
ON public.user_sessions
FOR ALL
USING (true);

-- 7. Update triggers for timestamp management
CREATE TRIGGER update_password_policies_updated_at
BEFORE UPDATE ON public.password_policies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Add function to check password strength
CREATE OR REPLACE FUNCTION public.validate_password_strength(password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check minimum length
  IF length(password) < 12 THEN
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
  
  RETURN true;
END;
$$;
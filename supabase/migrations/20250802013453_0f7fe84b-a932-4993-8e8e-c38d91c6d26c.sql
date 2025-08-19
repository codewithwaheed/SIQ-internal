-- Fix all function search paths by adding SET search_path = 'public'
-- This prevents potential security vulnerabilities from search path manipulation

-- Fix has_role function
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

-- Fix get_user_role function
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

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  user_role user_role;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (user_id, email, first_name, last_name, company_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'company_name'
  );
  
  -- Get role from metadata, default to business_owner
  user_role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::user_role,
    'business_owner'::user_role
  );
  
  -- Assign role based on signup selection
  INSERT INTO public.user_roles (user_id, role, self_selected)
  VALUES (NEW.id, user_role, true);
  
  RETURN NEW;
END;
$function$;

-- Fix reset_monthly_usage function
CREATE OR REPLACE FUNCTION public.reset_monthly_usage()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  UPDATE public.subscribers 
  SET 
    monthly_uploads_used = 0,
    monthly_escalations_used = 0,
    billing_cycle_start = now()
  WHERE subscribed = true 
    AND billing_cycle_start < now() - interval '1 month';
END;
$function$;

-- Fix get_tier_limits function
CREATE OR REPLACE FUNCTION public.get_tier_limits(tier_name text)
 RETURNS TABLE(upload_limit integer, escalation_limit integer)
 LANGUAGE sql
 STABLE
 SET search_path = 'public'
AS $function$
  SELECT 
    CASE 
      WHEN tier_name = 'Basic' THEN 0
      WHEN tier_name = 'Pro' THEN 5
      WHEN tier_name = 'Premium' THEN -1  -- unlimited
      ELSE 0
    END as upload_limit,
    CASE 
      WHEN tier_name = 'Basic' THEN 0
      WHEN tier_name = 'Pro' THEN 0
      WHEN tier_name = 'Premium' THEN 2
      ELSE 0
    END as escalation_limit;
$function$;

-- Fix can_user_perform_action function
CREATE OR REPLACE FUNCTION public.can_user_perform_action(user_email text, action_type text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  user_tier TEXT;
  uploads_used INTEGER;
  escalations_used INTEGER;
  upload_limit INTEGER;
  escalation_limit INTEGER;
BEGIN
  -- Get user's current usage and tier
  SELECT 
    s.subscription_tier,
    s.monthly_uploads_used,
    s.monthly_escalations_used
  INTO user_tier, uploads_used, escalations_used
  FROM public.subscribers s
  WHERE s.email = user_email;
  
  -- If user not found, default to Basic tier
  IF user_tier IS NULL THEN
    user_tier := 'Basic';
    uploads_used := 0;
    escalations_used := 0;
  END IF;
  
  -- Get limits for this tier
  SELECT ul.upload_limit, ul.escalation_limit 
  INTO upload_limit, escalation_limit
  FROM public.get_tier_limits(user_tier) ul;
  
  -- Check based on action type
  IF action_type = 'upload' THEN
    RETURN (upload_limit = -1 OR uploads_used < upload_limit);
  ELSIF action_type = 'escalation' THEN
    RETURN (escalation_limit = -1 OR escalations_used < escalation_limit);
  END IF;
  
  RETURN false;
END;
$function$;

-- Fix increment_upload_count function
CREATE OR REPLACE FUNCTION public.increment_upload_count(user_email text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  UPDATE public.subscribers 
  SET 
    monthly_uploads_used = monthly_uploads_used + 1,
    updated_at = now()
  WHERE email = user_email;
  
  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.subscribers (email, monthly_uploads_used, updated_at)
    VALUES (user_email, 1, now())
    ON CONFLICT (email) 
    DO UPDATE SET 
      monthly_uploads_used = subscribers.monthly_uploads_used + 1,
      updated_at = now();
  END IF;
END;
$function$;

-- Fix increment_escalation_count function
CREATE OR REPLACE FUNCTION public.increment_escalation_count(user_email text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  UPDATE public.subscribers 
  SET 
    monthly_escalations_used = monthly_escalations_used + 1,
    updated_at = now()
  WHERE email = user_email;
  
  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.subscribers (email, monthly_escalations_used, updated_at)
    VALUES (user_email, 1, now())
    ON CONFLICT (email) 
    DO UPDATE SET 
      monthly_escalations_used = subscribers.monthly_escalations_used + 1,
      updated_at = now();
  END IF;
END;
$function$;

-- Fix the critical RLS policy for subscribers table
-- Remove the overly permissive update policy and replace with proper access control
DROP POLICY IF EXISTS "update_own_subscription" ON public.subscribers;

-- Create a secure update policy that only allows users to update their own records
CREATE POLICY "Users can update their own subscription" 
ON public.subscribers 
FOR UPDATE 
USING (user_id = auth.uid() OR email = auth.email());
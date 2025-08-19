-- Fix the missing get_users_with_roles function needed by admin-users edge function
CREATE OR REPLACE FUNCTION public.get_users_with_roles(
  limit_val INTEGER DEFAULT 50,
  offset_val INTEGER DEFAULT 0,
  search_term TEXT DEFAULT ''
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  company_name TEXT,
  role user_role,
  created_at TIMESTAMP WITH TIME ZONE,
  last_active_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only admins can call this function
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    p.user_id,
    p.email,
    p.first_name,
    p.last_name,
    p.company_name,
    ur.role,
    p.created_at,
    p.last_active_at
  FROM public.profiles p
  JOIN public.user_roles ur ON p.user_id = ur.user_id
  WHERE 
    (search_term = '' OR 
     p.email ILIKE '%' || search_term || '%' OR
     p.first_name ILIKE '%' || search_term || '%' OR
     p.last_name ILIKE '%' || search_term || '%' OR
     p.company_name ILIKE '%' || search_term || '%')
  ORDER BY p.created_at DESC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$;

-- Create consultant profiles table to extend user profiles with consultant-specific data
CREATE TABLE IF NOT EXISTS public.consultant_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  bio TEXT,
  expertise_areas TEXT[] DEFAULT '{}',
  certifications TEXT[] DEFAULT '{}',
  years_experience INTEGER,
  hourly_rate DECIMAL(10,2),
  availability_status TEXT DEFAULT 'offline' CHECK (availability_status IN ('online', 'offline', 'busy', 'away')),
  timezone TEXT DEFAULT 'UTC',
  availability_hours JSONB DEFAULT '{}', -- Store availability schedule
  specializations TEXT[] DEFAULT '{}',
  security_clearance TEXT,
  work_authorization TEXT,
  languages TEXT[] DEFAULT '{"English"}',
  rating DECIMAL(3,2) DEFAULT 0.00,
  total_escalations_handled INTEGER DEFAULT 0,
  avg_response_time_hours DECIMAL(5,2) DEFAULT 0.00,
  success_rate DECIMAL(3,2) DEFAULT 0.00,
  client_feedback_score DECIMAL(3,2) DEFAULT 0.00,
  portfolio_url TEXT,
  linkedin_url TEXT,
  resume_url TEXT,
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for consultant profiles
ALTER TABLE public.consultant_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for consultant profiles
CREATE POLICY "Consultants can view all consultant profiles"
ON public.consultant_profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'consultant') OR 
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Consultants can update their own profile"
ON public.consultant_profiles
FOR UPDATE
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert consultant profiles"
ON public.consultant_profiles
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete consultant profiles"
ON public.consultant_profiles
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Business owners can view basic consultant info for escalations
CREATE POLICY "Business owners can view basic consultant info"
ON public.consultant_profiles
FOR SELECT
USING (has_role(auth.uid(), 'business_owner') AND is_active = true);

-- Add updated_at trigger
CREATE TRIGGER update_consultant_profiles_updated_at
  BEFORE UPDATE ON public.consultant_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get available consultants for assignment
CREATE OR REPLACE FUNCTION public.get_available_consultants(
  expertise_filter TEXT[] DEFAULT NULL,
  limit_val INTEGER DEFAULT 10
)
RETURNS TABLE (
  consultant_id UUID,
  user_id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  expertise_areas TEXT[],
  availability_status TEXT,
  rating DECIMAL,
  total_escalations_handled INTEGER,
  avg_response_time_hours DECIMAL,
  last_active_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.id as consultant_id,
    cp.user_id,
    p.email,
    p.first_name,
    p.last_name,
    cp.expertise_areas,
    cp.availability_status,
    cp.rating,
    cp.total_escalations_handled,
    cp.avg_response_time_hours,
    cp.last_active_at
  FROM public.consultant_profiles cp
  JOIN public.profiles p ON cp.user_id = p.user_id
  WHERE 
    cp.is_active = true
    AND cp.availability_status IN ('online', 'away')
    AND (
      expertise_filter IS NULL OR 
      cp.expertise_areas && expertise_filter
    )
  ORDER BY 
    CASE cp.availability_status 
      WHEN 'online' THEN 1 
      WHEN 'away' THEN 2 
      ELSE 3 
    END,
    cp.rating DESC,
    cp.last_active_at DESC
  LIMIT limit_val;
END;
$$;

-- Function to update consultant availability
CREATE OR REPLACE FUNCTION public.update_consultant_availability(
  consultant_user_id UUID,
  new_status TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if user is the consultant or an admin
  IF NOT (consultant_user_id = auth.uid() OR has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Access denied: Can only update own availability or admin required';
  END IF;

  -- Validate status
  IF new_status NOT IN ('online', 'offline', 'busy', 'away') THEN
    RAISE EXCEPTION 'Invalid availability status: %', new_status;
  END IF;

  -- Update availability and last_active_at
  UPDATE public.consultant_profiles 
  SET 
    availability_status = new_status,
    last_active_at = now(),
    updated_at = now()
  WHERE user_id = consultant_user_id;

  -- Log the availability change
  INSERT INTO public.audit_logs (
    user_id,
    action,
    description,
    metadata
  ) VALUES (
    auth.uid(),
    'CONSULTANT_AVAILABILITY_CHANGED',
    'Consultant availability changed to: ' || new_status,
    jsonb_build_object(
      'consultant_user_id', consultant_user_id,
      'new_status', new_status,
      'timestamp', now()
    )
  );

  RETURN true;
END;
$$;

-- Function to create consultant profile from approved application
CREATE OR REPLACE FUNCTION public.create_consultant_from_application(
  application_id UUID,
  admin_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  app_record RECORD;
  new_user_id UUID;
  consultant_profile_id UUID;
BEGIN
  -- Only admins can call this
  IF NOT has_role(admin_user_id, 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  -- Get application details
  SELECT * INTO app_record
  FROM public.consultant_applications
  WHERE id = application_id AND status = 'approved';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found or not approved';
  END IF;

  -- Check if user already exists
  SELECT id INTO new_user_id
  FROM auth.users
  WHERE email = app_record.email;

  -- If user doesn't exist, we'll create the profile anyway and link it later
  -- This handles the case where admin creates consultant profiles before user signup
  
  -- Create consultant profile
  INSERT INTO public.consultant_profiles (
    user_id,
    bio,
    expertise_areas,
    certifications,
    years_experience,
    timezone,
    availability_hours,
    security_clearance,
    work_authorization,
    portfolio_url,
    linkedin_url,
    resume_url,
    is_verified,
    is_active
  ) VALUES (
    COALESCE(new_user_id, gen_random_uuid()), -- Temp UUID if user doesn't exist yet
    'Consultant profile created from application',
    app_record.expertise_areas,
    app_record.certifications,
    CASE 
      WHEN app_record.experience_years = '0-2 years' THEN 1
      WHEN app_record.experience_years = '3-5 years' THEN 4
      WHEN app_record.experience_years = '6-10 years' THEN 8
      WHEN app_record.experience_years = '10+ years' THEN 12
      ELSE 5
    END,
    app_record.timezone,
    jsonb_build_object('hours', app_record.availability_hours),
    app_record.security_clearance,
    app_record.work_authorization,
    app_record.portfolio_url,
    app_record.linkedin,
    app_record.resume_url,
    true, -- Verified since approved by admin
    true  -- Active
  ) RETURNING id INTO consultant_profile_id;

  -- Log the creation
  INSERT INTO public.audit_logs (
    user_id,
    action,
    description,
    metadata
  ) VALUES (
    admin_user_id,
    'CONSULTANT_PROFILE_CREATED',
    'Consultant profile created from application: ' || app_record.full_name,
    jsonb_build_object(
      'application_id', application_id,
      'consultant_profile_id', consultant_profile_id,
      'consultant_email', app_record.email,
      'created_by', admin_user_id
    )
  );

  RETURN consultant_profile_id;
END;
$$;
-- Create consultant applications table
CREATE TABLE public.consultant_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  linkedin TEXT,
  experience_years TEXT NOT NULL,
  expertise_areas TEXT[] NOT NULL DEFAULT '{}',
  certifications TEXT[] NOT NULL DEFAULT '{}',
  other_expertise TEXT,
  other_certifications TEXT,
  smb_experience BOOLEAN,
  vciso_experience BOOLEAN,
  timezone TEXT NOT NULL,
  availability_hours TEXT NOT NULL,
  work_authorization TEXT,
  security_clearance TEXT,
  engagement_preferences TEXT[] NOT NULL DEFAULT '{}',
  resume_url TEXT,
  portfolio_url TEXT,
  references TEXT,
  background_check_consent BOOLEAN NOT NULL DEFAULT false,
  nda_agreement BOOLEAN NOT NULL DEFAULT false,
  additional_info TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.consultant_applications ENABLE ROW LEVEL SECURITY;

-- Admins can view all applications
CREATE POLICY "Admins can view all applications"
ON public.consultant_applications
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Service can insert applications
CREATE POLICY "Service can insert applications"
ON public.consultant_applications
FOR INSERT
WITH CHECK (true);

-- Admins can update applications
CREATE POLICY "Admins can update applications"
ON public.consultant_applications
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_consultant_applications_updated_at
BEFORE UPDATE ON public.consultant_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Log application events
CREATE OR REPLACE FUNCTION public.log_application_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.audit_logs (
      action,
      description,
      user_id,
      metadata
    ) VALUES (
      'APPLICATION_STATUS_CHANGE',
      'Consultant application status changed from ' || COALESCE(OLD.status, 'none') || ' to ' || NEW.status,
      auth.uid(),
      jsonb_build_object(
        'application_id', NEW.id,
        'applicant_email', NEW.email,
        'applicant_name', NEW.full_name,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'approved_by', NEW.approved_by,
        'timestamp', now()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for status changes
CREATE TRIGGER log_application_status_changes
AFTER UPDATE ON public.consultant_applications
FOR EACH ROW
EXECUTE FUNCTION public.log_application_status_change();
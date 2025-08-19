-- Add consultant expertise and availability to profiles
ALTER TABLE public.profiles 
ADD COLUMN expertise_areas TEXT[],
ADD COLUMN availability_status TEXT DEFAULT 'offline',
ADD COLUMN last_assignment_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN total_escalations_handled INTEGER DEFAULT 0;

-- Create consultants view for easier querying
CREATE VIEW public.consultants AS
SELECT 
  p.*,
  ur.role
FROM public.profiles p
JOIN public.user_roles ur ON p.user_id = ur.user_id
WHERE ur.role = 'consultant';

-- Add escalation completion fields
ALTER TABLE public.escalations
ADD COLUMN escalation_type TEXT DEFAULT 'technical',
ADD COLUMN resolution_notes TEXT,
ADD COLUMN consultant_response_count INTEGER DEFAULT 0;

-- Insert sample consultants
INSERT INTO public.profiles (user_id, email, first_name, last_name, company_name, expertise_areas, availability_status)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'jane.doe@sentrIQ.com', 'Jane', 'Doe', 'SentrIQ Consulting', 
   ARRAY['compliance', 'NIST', 'risk-assessment', 'audit'], 'online'),
  ('00000000-0000-0000-0000-000000000002', 'mike.security@sentrIQ.com', 'Mike', 'Security', 'SentrIQ Consulting', 
   ARRAY['incident-response', 'malware', 'network-security', 'forensics'], 'online'),
  ('00000000-0000-0000-0000-000000000003', 'sarah.cloud@sentrIQ.com', 'Sarah', 'Cloud', 'SentrIQ Consulting', 
   ARRAY['cloud-security', 'AWS', 'Azure', 'container-security'], 'offline')
ON CONFLICT (email) DO NOTHING;

-- Insert corresponding user roles for consultants
INSERT INTO public.user_roles (user_id, role)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'consultant'),
  ('00000000-0000-0000-0000-000000000002', 'consultant'),
  ('00000000-0000-0000-0000-000000000003', 'consultant')
ON CONFLICT (user_id, role) DO NOTHING;
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
-- Sample consultant seeds intentionally skipped for local/dev to avoid
-- inserting auth-linked records from cloud environments. If you want
-- these sample users locally, create matching rows in auth.users first
-- or enable these inserts manually.
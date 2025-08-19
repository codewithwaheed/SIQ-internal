-- Add consultant expertise and availability to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS expertise_areas TEXT[],
ADD COLUMN IF NOT EXISTS availability_status TEXT DEFAULT 'offline',
ADD COLUMN IF NOT EXISTS last_assignment_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS total_escalations_handled INTEGER DEFAULT 0;

-- Create consultants view for easier querying
CREATE OR REPLACE VIEW public.consultants AS
SELECT 
  p.*,
  ur.role
FROM public.profiles p
JOIN public.user_roles ur ON p.user_id = ur.user_id
WHERE ur.role = 'consultant';

-- Add escalation completion fields
ALTER TABLE public.escalations
ADD COLUMN IF NOT EXISTS escalation_type TEXT DEFAULT 'technical',
ADD COLUMN IF NOT EXISTS resolution_notes TEXT,
ADD COLUMN IF NOT EXISTS consultant_response_count INTEGER DEFAULT 0;
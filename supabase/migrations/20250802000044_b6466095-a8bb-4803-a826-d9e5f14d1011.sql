-- Update escalations table structure to match requirements
ALTER TABLE public.escalations 
ADD COLUMN session_id uuid REFERENCES public.chat_conversations(id),
ADD COLUMN message_log jsonb,
ADD COLUMN assigned_consultant uuid;

-- Update existing records to use session_id (set to null for now as we need to map chat_context to actual sessions)
UPDATE public.escalations SET session_id = NULL WHERE session_id IS NULL;

-- Add index for better performance
CREATE INDEX idx_escalations_session_id ON public.escalations(session_id);
CREATE INDEX idx_escalations_assigned_consultant ON public.escalations(assigned_consultant);
CREATE INDEX idx_escalations_status ON public.escalations(status);

-- Update RLS policies to work with new structure
DROP POLICY IF EXISTS "Consultants can view assigned escalations" ON public.escalations;
DROP POLICY IF EXISTS "Consultants can update escalations" ON public.escalations;

CREATE POLICY "Consultants can view all escalations" 
ON public.escalations 
FOR SELECT 
USING (has_role(auth.uid(), 'consultant'::user_role) OR has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Consultants can update escalations" 
ON public.escalations 
FOR UPDATE 
USING (has_role(auth.uid(), 'consultant'::user_role) OR has_role(auth.uid(), 'admin'::user_role));
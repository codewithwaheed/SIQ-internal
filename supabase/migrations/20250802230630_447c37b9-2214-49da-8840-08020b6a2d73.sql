-- Enhanced escalation state model with timers and SLA tracking
ALTER TABLE escalations 
ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'drafted',
ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS routing_inputs JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS routing_decision JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS context_pack JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS timer_paused_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pause_reason TEXT,
ADD COLUMN IF NOT EXISTS timezone TEXT,
ADD COLUMN IF NOT EXISTS language_preference TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS clearance_requirement TEXT,
ADD COLUMN IF NOT EXISTS industry_context TEXT,
ADD COLUMN IF NOT EXISTS framework_tags TEXT[],
ADD COLUMN IF NOT EXISTS risk_flags TEXT[],
ADD COLUMN IF NOT EXISTS environment_notes TEXT;

-- Create escalation states enum if not exists
DO $$ BEGIN
  CREATE TYPE escalation_state AS ENUM (
    'drafted',
    'submitted', 
    'routing',
    'assigned',
    'in_progress',
    'awaiting_user',
    'resolved',
    'closed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Update escalations table to use the enum
ALTER TABLE escalations 
ALTER COLUMN state TYPE escalation_state USING state::escalation_state;

-- Create escalation audit trail for routing decisions
CREATE TABLE IF NOT EXISTS escalation_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escalation_id UUID REFERENCES escalations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID
);

-- Enable RLS on escalation audit
ALTER TABLE escalation_audit ENABLE ROW LEVEL SECURITY;

-- Create policies for escalation audit
CREATE POLICY "Consultants and admins can view escalation audit"
ON escalation_audit
FOR SELECT
USING (
  has_role(auth.uid(), 'consultant'::user_role) OR 
  has_role(auth.uid(), 'admin'::user_role)
);

CREATE POLICY "System can insert audit records"
ON escalation_audit
FOR INSERT
WITH CHECK (true);

-- Function to calculate SLA deadline based on urgency
CREATE OR REPLACE FUNCTION calculate_sla_deadline(urgency_level TEXT, submission_time TIMESTAMP WITH TIME ZONE)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
AS $$
DECLARE
  hours_to_add INTEGER;
BEGIN
  CASE urgency_level
    WHEN 'urgent' THEN hours_to_add := 2;   -- 2 hours
    WHEN 'high' THEN hours_to_add := 4;     -- 4 hours  
    WHEN 'medium' THEN hours_to_add := 24;  -- 24 hours
    WHEN 'low' THEN hours_to_add := 72;     -- 72 hours
    ELSE hours_to_add := 24;                -- Default 24 hours
  END CASE;
  
  RETURN submission_time + (hours_to_add || ' hours')::INTERVAL;
END;
$$;

-- Function to log escalation state changes
CREATE OR REPLACE FUNCTION log_escalation_state_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Log state change in audit trail
  INSERT INTO escalation_audit (
    escalation_id,
    event_type,
    event_data,
    created_by
  ) VALUES (
    NEW.id,
    'state_change',
    jsonb_build_object(
      'old_state', OLD.state,
      'new_state', NEW.state,
      'timestamp', now(),
      'sla_deadline', NEW.sla_deadline,
      'routing_decision', NEW.routing_decision
    ),
    auth.uid()
  );
  
  -- Set SLA deadline when moving to submitted state
  IF NEW.state = 'submitted' AND OLD.state != 'submitted' THEN
    NEW.sla_deadline := calculate_sla_deadline(NEW.priority, NEW.created_at);
  END IF;
  
  -- Record first response time when consultant responds
  IF NEW.state = 'in_progress' AND OLD.state = 'assigned' AND NEW.first_response_at IS NULL THEN
    NEW.first_response_at := now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for escalation state changes
DROP TRIGGER IF EXISTS escalation_state_change_trigger ON escalations;
CREATE TRIGGER escalation_state_change_trigger
  BEFORE UPDATE ON escalations
  FOR EACH ROW
  EXECUTE FUNCTION log_escalation_state_change();

-- Update existing escalations to have proper state
UPDATE escalations 
SET state = CASE 
  WHEN status = 'pending' THEN 'submitted'::escalation_state
  WHEN status = 'assigned' THEN 'assigned'::escalation_state  
  WHEN status = 'in_progress' THEN 'in_progress'::escalation_state
  WHEN status = 'resolved' THEN 'resolved'::escalation_state
  ELSE 'submitted'::escalation_state
END
WHERE state IS NULL OR state = 'drafted';

-- Enhanced consultant profiles with routing attributes
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS timezone TEXT,
ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT ARRAY['en'],
ADD COLUMN IF NOT EXISTS clearance_level TEXT,
ADD COLUMN IF NOT EXISTS industry_experience TEXT[],
ADD COLUMN IF NOT EXISTS response_time_avg INTEGER, -- in minutes
ADD COLUMN IF NOT EXISTS satisfaction_rating DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS primary_frameworks TEXT[],
ADD COLUMN IF NOT EXISTS max_concurrent_escalations INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS current_escalations INTEGER DEFAULT 0;
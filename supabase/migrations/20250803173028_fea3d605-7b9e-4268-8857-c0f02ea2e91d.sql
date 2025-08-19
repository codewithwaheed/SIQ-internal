-- First, create the escalation state enum
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

-- Add new columns to escalations table (without the problematic state column modification)
ALTER TABLE escalations 
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

-- Add a new state column with the proper enum type
ALTER TABLE escalations 
ADD COLUMN IF NOT EXISTS escalation_state escalation_state DEFAULT 'submitted';

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
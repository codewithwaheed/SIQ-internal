-- Create audit_logs table for comprehensive audit trail
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_id UUID, -- Reference to tenant/organization
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}', -- Additional structured data
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for performance on common queries
CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_tenant_id ON public.audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);

-- Enable Row Level Security
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role));

-- Edge functions can insert audit logs (using service role)
CREATE POLICY "Service can insert audit logs" ON public.audit_logs
FOR INSERT
WITH CHECK (true);

-- No updates or deletes allowed to ensure immutability
-- (No policies for UPDATE/DELETE means they're blocked for all users)

-- Create enum for common audit actions
CREATE TYPE public.audit_action AS ENUM (
  'LOGIN_SUCCESS',
  'LOGIN_FAILURE',
  'LOGOUT',
  'SIGNUP',
  'FILE_UPLOADED',
  'FILE_DOWNLOADED',
  'FILE_DELETED',
  'DOCUMENT_VIEWED',
  'CHAT_STARTED',
  'CHAT_MESSAGE_SENT',
  'ESCALATION_REQUESTED',
  'ESCALATION_ASSIGNED',
  'ESCALATION_RESOLVED',
  'CONSULTANT_RESPONSE',
  'SUBSCRIPTION_CREATED',
  'SUBSCRIPTION_UPDATED',
  'SUBSCRIPTION_CANCELLED',
  'ROLE_CHANGED',
  'USER_INVITED',
  'PROFILE_UPDATED',
  'PASSWORD_CHANGED',
  'MFA_ENABLED',
  'MFA_DISABLED',
  'ADMIN_ACTION',
  'SYSTEM_EVENT'
);

-- Update the action column to use the enum (optional - can also use TEXT for flexibility)
-- ALTER TABLE public.audit_logs ALTER COLUMN action TYPE public.audit_action USING action::audit_action;
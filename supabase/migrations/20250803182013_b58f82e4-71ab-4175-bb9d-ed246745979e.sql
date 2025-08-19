-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  escalation_id UUID REFERENCES public.escalations(id),
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notification settings table
CREATE TABLE public.notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email_enabled BOOLEAN DEFAULT true,
  in_app_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '08:00',
  timezone TEXT DEFAULT 'UTC',
  notification_types JSONB DEFAULT '{
    "escalation_submitted": {"email": true, "in_app": true},
    "escalation_assigned": {"email": true, "in_app": true},
    "first_response": {"email": true, "in_app": true},
    "action_required": {"email": true, "in_app": true},
    "meeting_booked": {"email": true, "in_app": true},
    "outcome_delivered": {"email": true, "in_app": true},
    "case_closed": {"email": true, "in_app": true},
    "reminder_idle": {"email": false, "in_app": true}
  }',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create deliverables table
CREATE TABLE public.deliverables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  escalation_id UUID NOT NULL REFERENCES public.escalations(id),
  consultant_id UUID NOT NULL,
  deliverable_type TEXT NOT NULL CHECK (deliverable_type IN ('summary_memo', 'policy_draft', 'checklist', 'risk_log_entry', 'meeting_notes', 'roadmap')),
  title TEXT NOT NULL,
  description TEXT,
  content JSONB NOT NULL DEFAULT '{}',
  file_attachments JSONB DEFAULT '[]',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'accepted', 'revision_requested')),
  acceptance_deadline TIMESTAMP WITH TIME ZONE,
  user_feedback TEXT,
  revision_notes TEXT,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create admin activity logs table
CREATE TABLE public.admin_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  target_id UUID,
  target_type TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create escalation metrics table for reporting
CREATE TABLE public.escalation_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  escalation_id UUID NOT NULL REFERENCES public.escalations(id) UNIQUE,
  first_response_time INTERVAL,
  resolution_time INTERVAL,
  consultant_response_count INTEGER DEFAULT 0,
  user_satisfaction_rating INTEGER CHECK (user_satisfaction_rating BETWEEN 1 AND 5),
  user_satisfaction_feedback TEXT,
  reopened_count INTEGER DEFAULT 0,
  framework_tags TEXT[],
  complexity_score INTEGER CHECK (complexity_score BETWEEN 1 AND 10),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalation_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Service can insert notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view all notifications" 
ON public.notifications 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role));

-- RLS Policies for notification settings
CREATE POLICY "Users can manage their own notification settings" 
ON public.notification_settings 
FOR ALL 
USING (user_id = auth.uid());

-- RLS Policies for deliverables
CREATE POLICY "Users can view deliverables for their escalations" 
ON public.deliverables 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.escalations e 
  WHERE e.id = deliverables.escalation_id 
  AND e.user_id = auth.uid()
));

CREATE POLICY "Consultants can manage deliverables" 
ON public.deliverables 
FOR ALL 
USING (has_role(auth.uid(), 'consultant'::user_role) OR has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Users can update deliverable acceptance" 
ON public.deliverables 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.escalations e 
  WHERE e.id = deliverables.escalation_id 
  AND e.user_id = auth.uid()
));

-- RLS Policies for admin activity
CREATE POLICY "Admins can view admin activity" 
ON public.admin_activity 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Service can insert admin activity" 
ON public.admin_activity 
FOR INSERT 
WITH CHECK (true);

-- RLS Policies for escalation metrics
CREATE POLICY "Users can view metrics for their escalations" 
ON public.escalation_metrics 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.escalations e 
  WHERE e.id = escalation_metrics.escalation_id 
  AND e.user_id = auth.uid()
));

CREATE POLICY "Consultants and admins can view all metrics" 
ON public.escalation_metrics 
FOR SELECT 
USING (has_role(auth.uid(), 'consultant'::user_role) OR has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Service can manage metrics" 
ON public.escalation_metrics 
FOR ALL 
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_escalation_id ON public.notifications(escalation_id);
CREATE INDEX idx_notifications_type ON public.notifications(notification_type);
CREATE INDEX idx_notifications_read ON public.notifications(read_at) WHERE read_at IS NULL;

CREATE INDEX idx_deliverables_escalation_id ON public.deliverables(escalation_id);
CREATE INDEX idx_deliverables_consultant_id ON public.deliverables(consultant_id);
CREATE INDEX idx_deliverables_status ON public.deliverables(status);

CREATE INDEX idx_admin_activity_admin_id ON public.admin_activity(admin_id);
CREATE INDEX idx_admin_activity_type ON public.admin_activity(activity_type);
CREATE INDEX idx_admin_activity_created_at ON public.admin_activity(created_at);

CREATE INDEX idx_escalation_metrics_escalation_id ON public.escalation_metrics(escalation_id);

-- Add triggers for updated_at
CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_settings_updated_at
BEFORE UPDATE ON public.notification_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_deliverables_updated_at
BEFORE UPDATE ON public.deliverables
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_escalation_metrics_updated_at
BEFORE UPDATE ON public.escalation_metrics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
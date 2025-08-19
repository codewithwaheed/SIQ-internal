-- Create tables for expert replies and consultation features

-- Consultant replies table
CREATE TABLE public.consultant_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  escalation_id UUID REFERENCES public.escalations(id) ON DELETE CASCADE,
  consultant_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('answer', 'checklist', 'policy', 'next_steps', 'file_attachment')),
  content TEXT NOT NULL,
  checklist_items JSONB DEFAULT NULL,
  attachments JSONB DEFAULT NULL,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Consultations/meetings table
CREATE TABLE public.consultations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  escalation_id UUID REFERENCES public.escalations(id) ON DELETE SET NULL,
  consultant_id UUID,
  user_id UUID NOT NULL,
  meeting_type TEXT NOT NULL CHECK (meeting_type IN ('video', 'audio', 'screen_share')),
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  timezone TEXT NOT NULL,
  agenda TEXT,
  preparation_notes TEXT,
  meeting_url TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Reply feedback table
CREATE TABLE public.reply_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reply_id UUID REFERENCES public.consultant_replies(id) ON DELETE CASCADE,
  escalation_id UUID REFERENCES public.escalations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('helpful', 'clarification_request')),
  feedback_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Storage bucket for consultant deliverables
INSERT INTO storage.buckets (id, name, public) VALUES ('consultant-deliverables', 'consultant-deliverables', false);

-- Enable RLS
ALTER TABLE public.consultant_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reply_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for consultant_replies
CREATE POLICY "Users can view replies for their escalations" ON public.consultant_replies
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.escalations e 
    WHERE e.id = consultant_replies.escalation_id 
    AND e.user_id = auth.uid()
  )
);

CREATE POLICY "Consultants can insert replies" ON public.consultant_replies
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'consultant'::user_role) OR 
  has_role(auth.uid(), 'admin'::user_role)
);

-- RLS Policies for consultations
CREATE POLICY "Users can view their own consultations" ON public.consultations
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create consultations" ON public.consultations
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Consultants can view assigned consultations" ON public.consultations
FOR SELECT USING (
  has_role(auth.uid(), 'consultant'::user_role) OR 
  has_role(auth.uid(), 'admin'::user_role)
);

-- RLS Policies for reply_feedback
CREATE POLICY "Users can manage their own feedback" ON public.reply_feedback
FOR ALL USING (user_id = auth.uid());

-- Storage policies for consultant deliverables
CREATE POLICY "Users can view deliverables for their escalations" ON storage.objects
FOR SELECT USING (
  bucket_id = 'consultant-deliverables' AND
  EXISTS (
    SELECT 1 FROM public.escalations e 
    WHERE e.user_id = auth.uid() 
    AND storage.foldername(name)[1] = e.id::text
  )
);

CREATE POLICY "Consultants can upload deliverables" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'consultant-deliverables' AND
  (has_role(auth.uid(), 'consultant'::user_role) OR has_role(auth.uid(), 'admin'::user_role))
);
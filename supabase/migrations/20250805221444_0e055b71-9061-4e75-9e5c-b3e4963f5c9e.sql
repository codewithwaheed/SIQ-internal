-- Create feedback table for consultant feedback on AI responses
CREATE TABLE public.ai_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  message_id TEXT, -- Can reference specific chat messages
  escalation_id UUID REFERENCES public.escalations(id) ON DELETE CASCADE,
  consultant_id UUID NOT NULL, -- User ID of the consultant providing feedback
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('ai_correct', 'ai_incorrect', 'ai_incomplete', 'ai_unhelpful', 'escalation_unnecessary', 'escalation_justified', 'other')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- 1-5 star rating
  comments TEXT,
  ai_response_quality TEXT CHECK (ai_response_quality IN ('excellent', 'good', 'average', 'poor', 'very_poor')),
  suggested_improvement TEXT, -- What the consultant would suggest instead
  category_tags TEXT[] DEFAULT '{}', -- Tags for categorizing feedback
  is_training_data BOOLEAN DEFAULT false, -- Flag for using as training data
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS on ai_feedback table
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ai_feedback
CREATE POLICY "Consultants can create feedback"
ON public.ai_feedback
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'consultant') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Consultants can view feedback"
ON public.ai_feedback
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'consultant') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Consultants can update their own feedback"
ON public.ai_feedback
FOR UPDATE
TO authenticated
USING ((consultant_id = auth.uid()) OR has_role(auth.uid(), 'admin'))
WITH CHECK ((consultant_id = auth.uid()) OR has_role(auth.uid(), 'admin'));

-- Create indexes for better performance
CREATE INDEX idx_ai_feedback_conversation_id ON public.ai_feedback(conversation_id);
CREATE INDEX idx_ai_feedback_escalation_id ON public.ai_feedback(escalation_id);
CREATE INDEX idx_ai_feedback_consultant_id ON public.ai_feedback(consultant_id);
CREATE INDEX idx_ai_feedback_feedback_type ON public.ai_feedback(feedback_type);
CREATE INDEX idx_ai_feedback_created_at ON public.ai_feedback(created_at);

-- Create trigger for updating updated_at timestamp
CREATE TRIGGER update_ai_feedback_updated_at
  BEFORE UPDATE ON public.ai_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create audit trigger for feedback changes
CREATE OR REPLACE FUNCTION public.log_ai_feedback_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    action,
    description,
    user_id,
    metadata
  ) VALUES (
    'AI_FEEDBACK_' || TG_OP,
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'AI feedback submitted: ' || NEW.feedback_type
      WHEN TG_OP = 'UPDATE' THEN 'AI feedback updated: ' || NEW.feedback_type
      WHEN TG_OP = 'DELETE' THEN 'AI feedback deleted: ' || OLD.feedback_type
    END,
    auth.uid(),
    jsonb_build_object(
      'feedback_id', COALESCE(NEW.id, OLD.id),
      'conversation_id', COALESCE(NEW.conversation_id, OLD.conversation_id),
      'escalation_id', COALESCE(NEW.escalation_id, OLD.escalation_id),
      'feedback_type', COALESCE(NEW.feedback_type, OLD.feedback_type),
      'rating', COALESCE(NEW.rating, OLD.rating),
      'operation', TG_OP,
      'timestamp', now()
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER ai_feedback_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.ai_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.log_ai_feedback_change();
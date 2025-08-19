-- Create AI query logs table for audit and analysis
CREATE TABLE public.ai_query_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  conversation_id uuid,
  question text NOT NULL,
  answer text,
  question_category text,
  model_used text,
  tokens_used integer DEFAULT 0,
  response_analysis jsonb DEFAULT '{}',
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create AI error logs table for debugging
CREATE TABLE public.ai_error_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  error_message text NOT NULL,
  request_url text,
  user_agent text,
  timestamp timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_query_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_error_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for ai_query_logs
CREATE POLICY "Users can view their own AI query logs"
ON public.ai_query_logs
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all AI query logs"
ON public.ai_query_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Service can insert AI query logs"
ON public.ai_query_logs
FOR ALL
WITH CHECK (true);

-- Create policies for ai_error_logs
CREATE POLICY "Admins can view AI error logs"
ON public.ai_error_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Service can insert AI error logs"
ON public.ai_error_logs
FOR INSERT
WITH CHECK (true);

-- Add indexes for performance
CREATE INDEX idx_ai_query_logs_user_id ON public.ai_query_logs(user_id);
CREATE INDEX idx_ai_query_logs_timestamp ON public.ai_query_logs(timestamp);
CREATE INDEX idx_ai_query_logs_category ON public.ai_query_logs(question_category);
CREATE INDEX idx_ai_error_logs_timestamp ON public.ai_error_logs(timestamp);
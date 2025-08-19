-- Add metadata column to chat_messages for structured responses
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Create evaluation tables for response control system
CREATE TABLE IF NOT EXISTS chat_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_message TEXT NOT NULL,
  ai_response_raw TEXT NOT NULL,
  ai_response_json JSONB,
  context_sources JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create AI evaluation runs table for harness results
CREATE TABLE IF NOT EXISTS ai_evaluation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id TEXT UNIQUE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_ms INTEGER NOT NULL,
  prompt_count INTEGER NOT NULL,
  aggregate_scores JSONB NOT NULL,
  individual_results JSONB NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0.0',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE chat_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_evaluation_runs ENABLE ROW LEVEL SECURITY;

-- Policies for chat_evaluations (users can view their own evaluation data)
CREATE POLICY "Users can view their own evaluation data" 
ON chat_evaluations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM chat_conversations 
    WHERE chat_conversations.id = chat_evaluations.conversation_id 
    AND chat_conversations.user_id = auth.uid()
  )
);

-- Policies for ai_evaluation_runs (admin only using user_roles table)
CREATE POLICY "Admins can view evaluation runs" 
ON ai_evaluation_runs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "System can insert evaluation runs" 
ON ai_evaluation_runs 
FOR INSERT 
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_evaluations_conversation_id ON chat_evaluations(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_evaluations_created_at ON chat_evaluations(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_evaluation_runs_run_id ON ai_evaluation_runs(run_id);
CREATE INDEX IF NOT EXISTS idx_ai_evaluation_runs_created_at ON ai_evaluation_runs(created_at);
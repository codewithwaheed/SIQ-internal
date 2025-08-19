-- Create master knowledge base table for cybersecurity frameworks
CREATE TABLE public.master_knowledge_base (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN ('framework_documentation', 'best_practices', 'policy_template', 'implementation_guide', 'standard_reference')),
  framework_category TEXT NOT NULL CHECK (framework_category IN ('NIST', 'ISO27001', 'SOC2', 'CMMC', 'HIPAA', 'FedRAMP', 'PCI_DSS', 'GDPR', 'general')),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  content_extracted TEXT,
  tags TEXT[] DEFAULT '{}',
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  version TEXT DEFAULT '1.0',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.master_knowledge_base ENABLE ROW LEVEL SECURITY;

-- Create policies for master knowledge base
CREATE POLICY "Everyone can view active master knowledge base documents" 
ON public.master_knowledge_base 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Only admins can manage master knowledge base" 
ON public.master_knowledge_base 
FOR ALL 
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create master knowledge embeddings table
CREATE TABLE public.master_knowledge_embeddings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  master_document_id UUID NOT NULL REFERENCES public.master_knowledge_base(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding VECTOR(1536), -- OpenAI ada-002 embedding size
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for embeddings
ALTER TABLE public.master_knowledge_embeddings ENABLE ROW LEVEL SECURITY;

-- Create policies for master embeddings
CREATE POLICY "Everyone can query master knowledge embeddings" 
ON public.master_knowledge_embeddings 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage master knowledge embeddings" 
ON public.master_knowledge_embeddings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create indexes for better performance
CREATE INDEX idx_master_knowledge_base_framework_category ON public.master_knowledge_base(framework_category);
CREATE INDEX idx_master_knowledge_base_content_type ON public.master_knowledge_base(content_type);
CREATE INDEX idx_master_knowledge_base_active ON public.master_knowledge_base(is_active);
CREATE INDEX idx_master_knowledge_embeddings_document_id ON public.master_knowledge_embeddings(master_document_id);

-- Create function to update updated_at timestamp
CREATE TRIGGER update_master_knowledge_base_updated_at
  BEFORE UPDATE ON public.master_knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create audit function for master knowledge base changes
CREATE OR REPLACE FUNCTION public.log_master_knowledge_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (
    action,
    description,
    user_id,
    metadata
  ) VALUES (
    'MASTER_KNOWLEDGE_' || TG_OP,
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'Master knowledge document added: ' || NEW.title
      WHEN TG_OP = 'UPDATE' THEN 'Master knowledge document updated: ' || NEW.title
      WHEN TG_OP = 'DELETE' THEN 'Master knowledge document deleted: ' || OLD.title
    END,
    auth.uid(),
    jsonb_build_object(
      'document_id', COALESCE(NEW.id, OLD.id),
      'title', COALESCE(NEW.title, OLD.title),
      'framework_category', COALESCE(NEW.framework_category, OLD.framework_category),
      'content_type', COALESCE(NEW.content_type, OLD.content_type),
      'operation', TG_OP,
      'timestamp', now()
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for audit logging
CREATE TRIGGER master_knowledge_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.master_knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION public.log_master_knowledge_change();
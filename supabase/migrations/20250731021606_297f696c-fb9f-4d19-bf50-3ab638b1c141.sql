-- Create storage buckets for user documents
INSERT INTO storage.buckets (id, name, public) VALUES ('user-documents', 'user-documents', false);

-- Create documents table to track uploaded files
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  content_extracted TEXT, -- For storing extracted text content for RAG
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Create escalations table to track escalation requests
CREATE TABLE public.escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_context TEXT NOT NULL, -- The conversation context when escalated
  reason TEXT, -- Optional reason for escalation
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'resolved', 'closed')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to UUID REFERENCES auth.users(id), -- Consultant assigned to this escalation
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on both tables
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalations ENABLE ROW LEVEL SECURITY;

-- RLS policies for documents
CREATE POLICY "Users can view their own documents" 
ON public.documents 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can upload their own documents" 
ON public.documents 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own documents" 
ON public.documents 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all documents" 
ON public.documents 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role));

-- RLS policies for escalations
CREATE POLICY "Users can view their own escalations" 
ON public.escalations 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can create escalations" 
ON public.escalations 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Consultants can view assigned escalations" 
ON public.escalations 
FOR SELECT 
USING (has_role(auth.uid(), 'consultant'::user_role) OR has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Consultants can update escalations" 
ON public.escalations 
FOR UPDATE 
USING (has_role(auth.uid(), 'consultant'::user_role) OR has_role(auth.uid(), 'admin'::user_role));

-- Storage policies for user documents
CREATE POLICY "Users can upload their own documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'user-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own documents" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'user-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own documents" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'user-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own documents" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'user-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create trigger for updated_at on escalations
CREATE TRIGGER update_escalations_updated_at
BEFORE UPDATE ON public.escalations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
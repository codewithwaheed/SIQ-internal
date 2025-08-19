-- Create policies table for persistent storage
CREATE TABLE public.policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES public.organizations(id),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  policy_type TEXT NOT NULL,
  content TEXT NOT NULL, -- Markdown content
  version TEXT NOT NULL DEFAULT '1.0',
  template_used TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;

-- RLS policies for organization-scoped access
CREATE POLICY "Users can view policies in their org" 
ON public.policies 
FOR SELECT 
USING (org_id = get_user_org_id());

CREATE POLICY "Users can create policies in their org" 
ON public.policies 
FOR INSERT 
WITH CHECK (org_id = get_user_org_id() AND user_id = auth.uid());

CREATE POLICY "Users can update policies in their org" 
ON public.policies 
FOR UPDATE 
USING (org_id = get_user_org_id());

CREATE POLICY "Users can delete policies in their org" 
ON public.policies 
FOR DELETE 
USING (org_id = get_user_org_id());

-- Add auto-assignment trigger for org_id
CREATE TRIGGER policies_auto_assign_org_id
  BEFORE INSERT ON public.policies
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_org_id();

-- Add updated_at trigger
CREATE TRIGGER update_policies_updated_at
  BEFORE UPDATE ON public.policies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
-- Create policy templates table
CREATE TABLE public.policy_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_shared BOOLEAN DEFAULT false,
  template_type TEXT DEFAULT 'policy',
  version TEXT DEFAULT '1.0',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create canned responses table
CREATE TABLE public.canned_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_shared BOOLEAN DEFAULT false,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create resource links table
CREATE TABLE public.resource_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  is_shared BOOLEAN DEFAULT false,
  access_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.policy_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canned_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for policy_templates
CREATE POLICY "Users can view templates in their org" ON public.policy_templates
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Users can create templates in their org" ON public.policy_templates
  FOR INSERT WITH CHECK (org_id = get_user_org_id() AND user_id = auth.uid());

CREATE POLICY "Users can update their own templates" ON public.policy_templates
  FOR UPDATE USING (org_id = get_user_org_id() AND user_id = auth.uid());

CREATE POLICY "Users can delete their own templates" ON public.policy_templates
  FOR DELETE USING (org_id = get_user_org_id() AND user_id = auth.uid());

-- RLS Policies for canned_responses
CREATE POLICY "Users can view canned responses in their org" ON public.canned_responses
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Users can create canned responses in their org" ON public.canned_responses
  FOR INSERT WITH CHECK (org_id = get_user_org_id() AND user_id = auth.uid());

CREATE POLICY "Users can update their own canned responses" ON public.canned_responses
  FOR UPDATE USING (org_id = get_user_org_id() AND user_id = auth.uid());

CREATE POLICY "Users can delete their own canned responses" ON public.canned_responses
  FOR DELETE USING (org_id = get_user_org_id() AND user_id = auth.uid());

-- RLS Policies for resource_links
CREATE POLICY "Users can view resource links in their org" ON public.resource_links
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Users can create resource links in their org" ON public.resource_links
  FOR INSERT WITH CHECK (org_id = get_user_org_id() AND user_id = auth.uid());

CREATE POLICY "Users can update their own resource links" ON public.resource_links
  FOR UPDATE USING (org_id = get_user_org_id() AND user_id = auth.uid());

CREATE POLICY "Users can delete their own resource links" ON public.resource_links
  FOR DELETE USING (org_id = get_user_org_id() AND user_id = auth.uid());

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_policy_templates_updated_at
  BEFORE UPDATE ON public.policy_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_canned_responses_updated_at
  BEFORE UPDATE ON public.canned_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_resource_links_updated_at
  BEFORE UPDATE ON public.resource_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create triggers to auto-assign org_id
CREATE TRIGGER auto_assign_org_policy_templates
  BEFORE INSERT ON public.policy_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_org_id();

CREATE TRIGGER auto_assign_org_canned_responses
  BEFORE INSERT ON public.canned_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_org_id();

CREATE TRIGGER auto_assign_org_resource_links
  BEFORE INSERT ON public.resource_links
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_org_id();

-- Create indexes for better performance
CREATE INDEX idx_policy_templates_org_category ON public.policy_templates(org_id, category);
CREATE INDEX idx_policy_templates_tags ON public.policy_templates USING GIN(tags);
CREATE INDEX idx_canned_responses_org_category ON public.canned_responses(org_id, category);
CREATE INDEX idx_canned_responses_tags ON public.canned_responses USING GIN(tags);
CREATE INDEX idx_resource_links_org_category ON public.resource_links(org_id, category);
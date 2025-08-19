-- Create organizations table
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Add org_id to profiles table
ALTER TABLE public.profiles ADD COLUMN org_id UUID REFERENCES public.organizations(id);

-- Create organization memberships table
CREATE TABLE public.organization_memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, org_id)
);

-- Enable RLS on organization memberships
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;

-- Create function to get user's org_id
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS UUID
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id 
  FROM public.organization_memberships 
  WHERE user_id = auth.uid() 
  LIMIT 1;
$$;

-- Create function to check if user belongs to org
CREATE OR REPLACE FUNCTION public.user_belongs_to_org(org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.organization_memberships 
    WHERE user_id = auth.uid() AND organization_memberships.org_id = user_belongs_to_org.org_id
  );
$$;

-- RLS Policies for organizations
CREATE POLICY "Users can view their organization"
ON public.organizations
FOR SELECT
USING (id = get_user_org_id());

CREATE POLICY "Organization admins can update their org"
ON public.organizations  
FOR UPDATE
USING (
  id = get_user_org_id() AND
  EXISTS (
    SELECT 1 FROM public.organization_memberships 
    WHERE user_id = auth.uid() AND org_id = organizations.id AND role = 'admin'
  )
);

-- RLS Policies for organization memberships
CREATE POLICY "Users can view memberships in their org"
ON public.organization_memberships
FOR SELECT
USING (user_belongs_to_org(org_id));

CREATE POLICY "Organization admins can manage memberships"
ON public.organization_memberships
FOR ALL
USING (
  user_belongs_to_org(org_id) AND
  EXISTS (
    SELECT 1 FROM public.organization_memberships AS admin_check
    WHERE admin_check.user_id = auth.uid() 
      AND admin_check.org_id = organization_memberships.org_id 
      AND admin_check.role = 'admin'
  )
);

-- Add org_id to critical tables
ALTER TABLE public.chat_conversations ADD COLUMN org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.documents ADD COLUMN org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.escalations ADD COLUMN org_id UUID REFERENCES public.organizations(id);

-- Update RLS policies for org-scoped access
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.chat_conversations;
CREATE POLICY "Users can view conversations in their org"
ON public.chat_conversations
FOR SELECT
USING (org_id = get_user_org_id());

DROP POLICY IF EXISTS "Users can create their own conversations" ON public.chat_conversations;
CREATE POLICY "Users can create conversations in their org"
ON public.chat_conversations
FOR INSERT
WITH CHECK (org_id = get_user_org_id() AND user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own conversations" ON public.chat_conversations;
CREATE POLICY "Users can update conversations in their org"
ON public.chat_conversations
FOR UPDATE
USING (org_id = get_user_org_id());

DROP POLICY IF EXISTS "Users can delete their own conversations" ON public.chat_conversations;
CREATE POLICY "Users can delete conversations in their org"
ON public.chat_conversations
FOR DELETE
USING (org_id = get_user_org_id());

-- Update documents RLS policies
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
CREATE POLICY "Users can view documents in their org"
ON public.documents
FOR SELECT
USING (org_id = get_user_org_id());

DROP POLICY IF EXISTS "Users can upload their own documents" ON public.documents;
CREATE POLICY "Users can upload documents to their org"
ON public.documents
FOR INSERT
WITH CHECK (org_id = get_user_org_id() AND user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own documents" ON public.documents;
CREATE POLICY "Users can update documents in their org"
ON public.documents
FOR UPDATE
USING (org_id = get_user_org_id());

-- Update escalations RLS policies
DROP POLICY IF EXISTS "Users can view their own escalations" ON public.escalations;
CREATE POLICY "Users can view escalations in their org"
ON public.escalations
FOR SELECT
USING (org_id = get_user_org_id());

DROP POLICY IF EXISTS "Users can create escalations" ON public.escalations;
CREATE POLICY "Users can create escalations in their org"
ON public.escalations
FOR INSERT
WITH CHECK (org_id = get_user_org_id() AND user_id = auth.uid());

-- Update profiles RLS policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view profiles in their org"
ON public.profiles
FOR SELECT
USING (org_id = get_user_org_id());

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (user_id = auth.uid() AND org_id = get_user_org_id());

-- Create trigger to auto-assign org_id when creating records
CREATE OR REPLACE FUNCTION public.auto_assign_org_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.org_id := get_user_org_id();
  RETURN NEW;
END;
$$;

-- Add triggers to auto-assign org_id
CREATE TRIGGER auto_assign_org_id_conversations
  BEFORE INSERT ON public.chat_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_org_id();

CREATE TRIGGER auto_assign_org_id_documents
  BEFORE INSERT ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_org_id();

CREATE TRIGGER auto_assign_org_id_escalations
  BEFORE INSERT ON public.escalations
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_org_id();
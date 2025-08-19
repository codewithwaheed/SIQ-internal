-- Add external source tracking fields to master_knowledge_base
ALTER TABLE public.master_knowledge_base 
ADD COLUMN source_type text DEFAULT 'manual',
ADD COLUMN source_url text,
ADD COLUMN source_id text,
ADD COLUMN last_synced_at timestamp with time zone,
ADD COLUMN content_hash text,
ADD COLUMN version_number integer DEFAULT 1;

-- Create external_sources table for managing feed sources
CREATE TABLE public.external_sources (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  source_type text NOT NULL, -- 'nist', 'mitre', 'cve', 'rss', 'api'
  base_url text NOT NULL,
  api_key_required boolean DEFAULT false,
  sync_frequency text DEFAULT 'daily', -- 'hourly', 'daily', 'weekly'
  last_sync_at timestamp with time zone,
  next_sync_at timestamp with time zone,
  is_active boolean DEFAULT true,
  sync_status text DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  framework_category text NOT NULL,
  content_type text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create sync_logs table for tracking sync history
CREATE TABLE public.sync_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id uuid NOT NULL REFERENCES public.external_sources(id) ON DELETE CASCADE,
  sync_started_at timestamp with time zone NOT NULL DEFAULT now(),
  sync_completed_at timestamp with time zone,
  status text NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed'
  documents_processed integer DEFAULT 0,
  documents_added integer DEFAULT 0,
  documents_updated integer DEFAULT 0,
  documents_skipped integer DEFAULT 0,
  error_message text,
  metadata jsonb DEFAULT '{}'
);

-- Enable RLS on new tables
ALTER TABLE public.external_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for external_sources
CREATE POLICY "Admins can manage external sources"
ON public.external_sources
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Create policies for sync_logs
CREATE POLICY "Admins can view sync logs"
ON public.sync_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Service can insert sync logs"
ON public.sync_logs
FOR INSERT
WITH CHECK (true);

-- Add indexes for performance
CREATE INDEX idx_master_knowledge_source_id ON public.master_knowledge_base(source_id);
CREATE INDEX idx_master_knowledge_content_hash ON public.master_knowledge_base(content_hash);
CREATE INDEX idx_external_sources_sync_status ON public.external_sources(sync_status, is_active);
CREATE INDEX idx_sync_logs_source_status ON public.sync_logs(source_id, status);

-- Create function to update updated_at timestamp
CREATE TRIGGER update_external_sources_updated_at
  BEFORE UPDATE ON public.external_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default external sources
INSERT INTO public.external_sources (name, source_type, base_url, framework_category, content_type, metadata) VALUES
('NIST Cybersecurity Framework', 'nist', 'https://www.nist.gov/cyberframework', 'NIST', 'framework_documentation', '{"feed_type": "rss", "description": "NIST Cybersecurity Framework updates and documentation"}'),
('MITRE ATT&CK Framework', 'mitre', 'https://attack.mitre.org/', 'general', 'framework_documentation', '{"feed_type": "api", "description": "MITRE ATT&CK tactics, techniques, and procedures"}'),
('CVE Database', 'cve', 'https://cve.mitre.org/', 'general', 'standard_reference', '{"feed_type": "api", "description": "Common Vulnerabilities and Exposures database"}'),
('NIST 800-171 Updates', 'nist', 'https://csrc.nist.gov/publications/detail/sp/800-171/rev-2/final', 'NIST', 'standard_reference', '{"feed_type": "web_scraping", "description": "NIST 800-171 special publication updates"}'),
('ISO 27001 Standards', 'iso', 'https://www.iso.org/standard/27001', 'ISO27001', 'standard_reference', '{"feed_type": "web_scraping", "description": "ISO 27001 information security standards"}')
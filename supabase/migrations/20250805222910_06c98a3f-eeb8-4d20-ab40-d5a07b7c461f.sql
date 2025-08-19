-- Create CVE cache table for storing vulnerability data
CREATE TABLE IF NOT EXISTS public.cve_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cve_id TEXT NOT NULL UNIQUE,
  description TEXT,
  published_date TIMESTAMP WITH TIME ZONE,
  modified_date TIMESTAMP WITH TIME ZONE,
  cvss_v3_score DECIMAL(3,1),
  cvss_v3_severity TEXT,
  cvss_v2_score DECIMAL(3,1),
  cvss_v2_severity TEXT,
  cwe_list TEXT[],
  references TEXT[],
  cached_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_cve_cache_cve_id ON public.cve_cache(cve_id);
CREATE INDEX IF NOT EXISTS idx_cve_cache_published_date ON public.cve_cache(published_date DESC);
CREATE INDEX IF NOT EXISTS idx_cve_cache_cvss_v3_score ON public.cve_cache(cvss_v3_score DESC);
CREATE INDEX IF NOT EXISTS idx_cve_cache_cvss_v3_severity ON public.cve_cache(cvss_v3_severity);
CREATE INDEX IF NOT EXISTS idx_cve_cache_cached_at ON public.cve_cache(cached_at);

-- Enable RLS on CVE cache table
ALTER TABLE public.cve_cache ENABLE ROW LEVEL SECURITY;

-- Create policies for CVE cache access
CREATE POLICY "CVE cache is readable by authenticated users" 
ON public.cve_cache 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "CVE cache is writable by admins only" 
ON public.cve_cache 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "CVE cache is updatable by admins only" 
ON public.cve_cache 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_cve_cache_updated_at
BEFORE UPDATE ON public.cve_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add CVE-related actions to audit logs enum if not exists
DO $$ 
BEGIN
  -- This would require checking if the enum values exist
  -- For now, we'll rely on the existing audit system
END $$;
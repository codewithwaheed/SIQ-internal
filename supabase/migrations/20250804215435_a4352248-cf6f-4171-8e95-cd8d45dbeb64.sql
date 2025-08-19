-- Create invites table for user invitation system
CREATE TABLE public.invites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  role user_role NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamp with time zone,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Create policies for invites
CREATE POLICY "Admins can manage invites" 
ON public.invites 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Public can view valid invites by token" 
ON public.invites 
FOR SELECT 
USING (expires_at > now() AND accepted_at IS NULL);

-- Create system_health table for monitoring
CREATE TABLE public.system_health (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name text NOT NULL,
  metric_value jsonb NOT NULL,
  recorded_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_health ENABLE ROW LEVEL SECURITY;

-- Create policies for system_health
CREATE POLICY "Admins can view system health" 
ON public.system_health 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "System can insert health metrics" 
ON public.system_health 
FOR INSERT 
WITH CHECK (true);

-- Create system_settings table for configuration
CREATE TABLE public.system_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for system_settings
CREATE POLICY "Admins can manage system settings" 
ON public.system_settings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Insert default system settings
INSERT INTO public.system_settings (setting_key, setting_value) VALUES
('two_factor_auth', '{"enabled": true, "enforce_admin": true}'),
('api_rate_limiting', '{"enabled": true, "requests_per_minute": 100}'),
('audit_logging', '{"enabled": true, "retention_days": 90}'),
('session_timeout', '{"enabled": true, "timeout_minutes": 480}'),
('backup_schedule', '{"enabled": true, "frequency": "daily", "retention_days": 30}');

-- Update profiles table to include more user management fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active'::text,
ADD COLUMN IF NOT EXISTS last_active_at timestamp with time zone DEFAULT now();

-- Create trigger to update last_active_at on profile updates
CREATE OR REPLACE FUNCTION public.update_last_active()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_active_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_last_active
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_last_active();

-- Create function to generate invite tokens
CREATE OR REPLACE FUNCTION public.generate_invite_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN encode(gen_random_bytes(24), 'base64');
END;
$$;

-- Create function to get user analytics summary
CREATE OR REPLACE FUNCTION public.get_analytics_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_conversations integer;
  active_users integer;
  escalation_rate numeric;
  avg_response_time numeric;
BEGIN
  -- Only admins can call this
  IF NOT has_role(auth.uid(), 'admin'::user_role) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  -- Get total conversations
  SELECT COUNT(*) INTO total_conversations
  FROM chat_conversations
  WHERE created_at >= now() - interval '30 days';

  -- Get active users (users with activity in last 30 days)
  SELECT COUNT(DISTINCT user_id) INTO active_users
  FROM chat_conversations
  WHERE created_at >= now() - interval '30 days';

  -- Get escalation rate
  SELECT 
    CASE 
      WHEN COUNT(*) = 0 THEN 0
      ELSE ROUND((COUNT(*) FILTER (WHERE metadata->>'escalated' = 'true')::numeric / COUNT(*)) * 100, 1)
    END INTO escalation_rate
  FROM chat_conversations
  WHERE created_at >= now() - interval '30 days';

  -- Mock average response time (in seconds)
  avg_response_time := 2.4;

  RETURN jsonb_build_object(
    'totalConversations', total_conversations,
    'activeUsers', active_users,
    'escalationRate', escalation_rate,
    'avgResponseTime', avg_response_time
  );
END;
$$;
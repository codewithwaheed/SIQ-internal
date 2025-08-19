-- Add usage tracking fields to subscribers table
ALTER TABLE public.subscribers 
ADD COLUMN IF NOT EXISTS monthly_uploads_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_escalations_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS billing_cycle_start TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS price_id TEXT;

-- Create function to reset monthly usage counters
CREATE OR REPLACE FUNCTION public.reset_monthly_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.subscribers 
  SET 
    monthly_uploads_used = 0,
    monthly_escalations_used = 0,
    billing_cycle_start = now()
  WHERE subscribed = true 
    AND billing_cycle_start < now() - interval '1 month';
END;
$$;

-- Create function to get usage limits based on subscription tier
CREATE OR REPLACE FUNCTION public.get_tier_limits(tier_name TEXT)
RETURNS TABLE(upload_limit INTEGER, escalation_limit INTEGER)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    CASE 
      WHEN tier_name = 'Basic' THEN 0
      WHEN tier_name = 'Pro' THEN 5
      WHEN tier_name = 'Premium' THEN -1  -- unlimited
      ELSE 0
    END as upload_limit,
    CASE 
      WHEN tier_name = 'Basic' THEN 0
      WHEN tier_name = 'Pro' THEN 0
      WHEN tier_name = 'Premium' THEN 2
      ELSE 0
    END as escalation_limit;
$$;

-- Create function to check if user can perform action
CREATE OR REPLACE FUNCTION public.can_user_perform_action(
  user_email TEXT, 
  action_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  user_tier TEXT;
  uploads_used INTEGER;
  escalations_used INTEGER;
  upload_limit INTEGER;
  escalation_limit INTEGER;
BEGIN
  -- Get user's current usage and tier
  SELECT 
    s.subscription_tier,
    s.monthly_uploads_used,
    s.monthly_escalations_used
  INTO user_tier, uploads_used, escalations_used
  FROM public.subscribers s
  WHERE s.email = user_email;
  
  -- If user not found, default to Basic tier
  IF user_tier IS NULL THEN
    user_tier := 'Basic';
    uploads_used := 0;
    escalations_used := 0;
  END IF;
  
  -- Get limits for this tier
  SELECT ul.upload_limit, ul.escalation_limit 
  INTO upload_limit, escalation_limit
  FROM public.get_tier_limits(user_tier) ul;
  
  -- Check based on action type
  IF action_type = 'upload' THEN
    RETURN (upload_limit = -1 OR uploads_used < upload_limit);
  ELSIF action_type = 'escalation' THEN
    RETURN (escalation_limit = -1 OR escalations_used < escalation_limit);
  END IF;
  
  RETURN false;
END;
$$;
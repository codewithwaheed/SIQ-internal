-- Create function to increment upload count
CREATE OR REPLACE FUNCTION public.increment_upload_count(user_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.subscribers 
  SET 
    monthly_uploads_used = monthly_uploads_used + 1,
    updated_at = now()
  WHERE email = user_email;
  
  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.subscribers (email, monthly_uploads_used, updated_at)
    VALUES (user_email, 1, now())
    ON CONFLICT (email) 
    DO UPDATE SET 
      monthly_uploads_used = subscribers.monthly_uploads_used + 1,
      updated_at = now();
  END IF;
END;
$$;

-- Create function to increment escalation count
CREATE OR REPLACE FUNCTION public.increment_escalation_count(user_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.subscribers 
  SET 
    monthly_escalations_used = monthly_escalations_used + 1,
    updated_at = now()
  WHERE email = user_email;
  
  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.subscribers (email, monthly_escalations_used, updated_at)
    VALUES (user_email, 1, now())
    ON CONFLICT (email) 
    DO UPDATE SET 
      monthly_escalations_used = subscribers.monthly_escalations_used + 1,
      updated_at = now();
  END IF;
END;
$$;
-- Update user_roles table to ensure we can track role selection during signup
-- Add a column to track if role was self-selected during signup
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS self_selected boolean DEFAULT false;

-- Update the handle_new_user function to accept role from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_role user_role;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (user_id, email, first_name, last_name, company_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'company_name'
  );
  
  -- Get role from metadata, default to business_owner
  user_role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::user_role,
    'business_owner'::user_role
  );
  
  -- Assign role based on signup selection
  INSERT INTO public.user_roles (user_id, role, self_selected)
  VALUES (NEW.id, user_role, true);
  
  RETURN NEW;
END;
$$;
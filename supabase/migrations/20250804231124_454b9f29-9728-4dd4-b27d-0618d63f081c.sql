-- Create a default organization and assign existing users
DO $$
DECLARE
    default_org_id UUID;
    user_record RECORD;
BEGIN
    -- Create a default organization if none exists
    INSERT INTO public.organizations (name, slug, settings)
    VALUES ('Default Organization', 'default-org', '{}')
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO default_org_id;
    
    -- Get the organization ID if it already existed
    IF default_org_id IS NULL THEN
        SELECT id INTO default_org_id FROM public.organizations WHERE slug = 'default-org' LIMIT 1;
    END IF;
    
    -- Assign all users without an org_id to the default organization
    FOR user_record IN 
        SELECT user_id FROM public.profiles WHERE org_id IS NULL
    LOOP
        -- Create organization membership
        INSERT INTO public.organization_memberships (user_id, org_id, role)
        VALUES (user_record.user_id, default_org_id, 'admin')
        ON CONFLICT (user_id, org_id) DO NOTHING;
        
        -- Update the user's profile
        UPDATE public.profiles 
        SET org_id = default_org_id 
        WHERE user_id = user_record.user_id;
    END LOOP;
END $$;
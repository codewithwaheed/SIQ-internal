import { supabase } from "@/integrations/supabase/client";

export async function getAccessToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? "";
}

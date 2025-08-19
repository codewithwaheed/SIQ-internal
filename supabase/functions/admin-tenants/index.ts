import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TenantData {
  id: string;
  email: string;
  company_name: string;
  subscription_tier: string;
  subscribed: boolean;
  created_at: string;
  total_documents: number;
  monthly_uploads_used: number;
  monthly_escalations_used: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify user is admin
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if user is admin
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!userRole) {
      return new Response(JSON.stringify({ error: 'Unauthorized - Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get tenant data with subscription info and document counts
    const { data: tenants, error } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        company_name,
        created_at,
        user_id
      `);

    if (error) {
      console.error('Error fetching tenants:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch tenants' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get subscription data
    const { data: subscriptions } = await supabase
      .from('subscribers')
      .select(`
        email,
        subscription_tier,
        subscribed,
        monthly_uploads_used,
        monthly_escalations_used
      `);

    // Get document counts
    const { data: documentCounts } = await supabase
      .from('documents')
      .select('user_id');

    // Create document count map
    const docCountMap = documentCounts?.reduce((acc, doc) => {
      acc[doc.user_id] = (acc[doc.user_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Create subscription map
    const subMap = subscriptions?.reduce((acc, sub) => {
      acc[sub.email] = sub;
      return acc;
    }, {} as Record<string, any>) || {};

    // Combine data
    const tenantsData: TenantData[] = tenants?.map(tenant => {
      const subscription = subMap[tenant.email] || {};
      return {
        id: tenant.id,
        email: tenant.email,
        company_name: tenant.company_name || 'N/A',
        subscription_tier: subscription.subscription_tier || 'Basic',
        subscribed: subscription.subscribed || false,
        created_at: tenant.created_at,
        total_documents: docCountMap[tenant.user_id] || 0,
        monthly_uploads_used: subscription.monthly_uploads_used || 0,
        monthly_escalations_used: subscription.monthly_escalations_used || 0
      };
    }) || [];

    return new Response(JSON.stringify({ tenants: tenantsData }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in admin-tenants function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
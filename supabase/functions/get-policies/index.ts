import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { authenticateRequest, sanitizeError } from '../_shared/auth-middleware.ts';
import { securityHeaders } from '../_shared/security-utils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  ...securityHeaders,
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    // Authenticate the user
    const authResult = await authenticateRequest(req, supabaseClient);
    const user = authResult.user;

    console.log('[GET-POLICIES] Request authenticated', { userId: user.id });

    // Get query parameters
    const url = new URL(req.url);
    const policyType = url.searchParams.get('policy_type');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Build query
    let query = supabaseClient
      .from('policies')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by policy type if specified
    if (policyType) {
      query = query.eq('policy_type', policyType);
    }

    console.log('[GET-POLICIES] Fetching policies', {
      policyType: policyType || 'all',
      limit,
      offset,
    });

    const { data: policies, error: fetchError } = await query;

    if (fetchError) {
      console.error('[GET-POLICIES] Database error:', fetchError);
      throw new Error(`Failed to fetch policies: ${fetchError.message}`);
    }

    console.log('[GET-POLICIES] Policies fetched successfully', {
      count: policies?.length || 0,
    });

    return new Response(
      JSON.stringify({
        success: true,
        policies: policies || [],
        count: policies?.length || 0,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('[GET-POLICIES] Error:', error);
    return new Response(JSON.stringify({ error: sanitizeError(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

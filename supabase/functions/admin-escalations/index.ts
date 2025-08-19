import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EscalationData {
  id: string;
  created_at: string;
  status: string;
  priority: string;
  escalation_type: string;
  reason: string;
  user_email: string;
  company_name: string;
  consultant_email?: string;
  consultant_name?: string;
  resolution_notes?: string;
  resolved_at?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verify user is admin
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get escalations with user and consultant info
    const { data: escalations, error } = await supabase
      .from('escalations')
      .select(
        `
        id,
        created_at,
        status,
        priority,
        escalation_type,
        reason,
        resolution_notes,
        resolved_at,
        assigned_consultant,
        user_id,
        user_profile:profiles!escalations_user_id_fkey(email, company_name, first_name, last_name)
      `,
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching escalations:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch escalations' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get consultant info for assigned escalations
    const consultantIds =
      escalations?.filter((e) => e.assigned_consultant).map((e) => e.assigned_consultant) || [];
    let consultantMap = {};

    if (consultantIds.length > 0) {
      const { data: consultants } = await supabase
        .from('profiles')
        .select('user_id, email, first_name, last_name')
        .in('user_id', consultantIds);

      consultantMap =
        consultants?.reduce(
          (acc, consultant) => {
            acc[consultant.user_id] = consultant;
            return acc;
          },
          {} as Record<string, any>,
        ) || {};
    }

    // Format escalation data
    const escalationsData: EscalationData[] =
      escalations?.map((escalation) => {
        const consultant = consultantMap[escalation.assigned_consultant];

        return {
          id: escalation.id,
          created_at: escalation.created_at,
          status: escalation.status || 'pending',
          priority: escalation.priority || 'normal',
          escalation_type: escalation.escalation_type || 'technical',
          reason: escalation.reason || 'Support needed',
          user_email: escalation.user_profile?.email || 'N/A',
          company_name: escalation.user_profile?.company_name || 'N/A',
          consultant_email: consultant?.email,
          consultant_name: consultant
            ? `${consultant.first_name || ''} ${consultant.last_name || ''}`.trim()
            : undefined,
          resolution_notes: escalation.resolution_notes,
          resolved_at: escalation.resolved_at,
        };
      }) || [];

    // Calculate statistics
    const stats = {
      total: escalationsData.length,
      pending: escalationsData.filter((e) => e.status === 'pending').length,
      active: escalationsData.filter((e) => e.status === 'active').length,
      resolved: escalationsData.filter((e) => e.status === 'resolved').length,
      high_priority: escalationsData.filter((e) => e.priority === 'high').length,
    };

    return new Response(
      JSON.stringify({
        escalations: escalationsData,
        stats,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Error in admin-escalations function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

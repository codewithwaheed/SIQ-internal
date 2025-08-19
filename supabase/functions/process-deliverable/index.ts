import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeliverableRequest {
  action: 'create' | 'update' | 'accept' | 'request_revision';
  escalation_id: string;
  deliverable_id?: string;
  deliverable_type?:
    | 'summary_memo'
    | 'policy_draft'
    | 'checklist'
    | 'risk_log_entry'
    | 'meeting_notes'
    | 'roadmap';
  title?: string;
  description?: string;
  content?: any;
  file_attachments?: Array<{
    name: string;
    url: string;
    size: number;
  }>;
  user_feedback?: string;
  revision_notes?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      },
    );

    // Get user from JWT
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Invalid or expired token');
    }

    const deliverableData: DeliverableRequest = await req.json();
    console.log('Processing deliverable request:', deliverableData);

    let result;

    switch (deliverableData.action) {
      case 'create':
        result = await createDeliverable(supabase, user.id, deliverableData);
        break;
      case 'update':
        result = await updateDeliverable(supabase, deliverableData);
        break;
      case 'accept':
        result = await acceptDeliverable(supabase, user.id, deliverableData);
        break;
      case 'request_revision':
        result = await requestRevision(supabase, user.id, deliverableData);
        break;
      default:
        throw new Error('Invalid action');
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in process-deliverable function:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});

async function createDeliverable(supabase: any, userId: string, data: DeliverableRequest) {
  // Check if user has consultant role
  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();

  if (!userRole || (userRole.role !== 'consultant' && userRole.role !== 'admin')) {
    throw new Error('Only consultants can create deliverables');
  }

  const { data: deliverable, error } = await supabase
    .from('deliverables')
    .insert({
      escalation_id: data.escalation_id,
      consultant_id: userId,
      deliverable_type: data.deliverable_type,
      title: data.title,
      description: data.description,
      content: data.content || {},
      file_attachments: data.file_attachments || [],
      status: 'draft',
    })
    .select()
    .single();

  if (error) throw error;

  return { success: true, deliverable };
}

async function updateDeliverable(supabase: any, data: DeliverableRequest) {
  const { data: deliverable, error } = await supabase
    .from('deliverables')
    .update({
      title: data.title,
      description: data.description,
      content: data.content,
      file_attachments: data.file_attachments,
      status: 'submitted',
    })
    .eq('id', data.deliverable_id)
    .select()
    .single();

  if (error) throw error;

  // Send notification to user
  await supabase.functions.invoke('send-notification', {
    body: {
      type: 'outcome_delivered',
      escalation_id: deliverable.escalation_id,
      consultant_email: '', // Will be populated from escalation
      priority: 'normal',
    },
  });

  return { success: true, deliverable };
}

async function acceptDeliverable(supabase: any, userId: string, data: DeliverableRequest) {
  // Verify user owns the escalation
  const { data: escalation } = await supabase
    .from('escalations')
    .select('user_id')
    .eq('id', data.escalation_id)
    .single();

  if (!escalation || escalation.user_id !== userId) {
    throw new Error('Unauthorized to accept this deliverable');
  }

  const { data: deliverable, error } = await supabase
    .from('deliverables')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      user_feedback: data.user_feedback,
    })
    .eq('id', data.deliverable_id)
    .select()
    .single();

  if (error) throw error;

  // Update escalation metrics
  await supabase.from('escalation_metrics').upsert({
    escalation_id: data.escalation_id,
    user_satisfaction_rating: 5, // Default high rating for accepted deliverable
  });

  return { success: true, deliverable };
}

async function requestRevision(supabase: any, userId: string, data: DeliverableRequest) {
  // Verify user owns the escalation
  const { data: escalation } = await supabase
    .from('escalations')
    .select('user_id')
    .eq('id', data.escalation_id)
    .single();

  if (!escalation || escalation.user_id !== userId) {
    throw new Error('Unauthorized to request revision');
  }

  const { data: deliverable, error } = await supabase
    .from('deliverables')
    .update({
      status: 'revision_requested',
      revision_notes: data.revision_notes,
    })
    .eq('id', data.deliverable_id)
    .select()
    .single();

  if (error) throw error;

  // Send notification to consultant
  await supabase.functions.invoke('send-notification', {
    body: {
      type: 'action_required',
      escalation_id: deliverable.escalation_id,
      consultant_email: '', // Will be populated from consultant
      priority: 'high',
    },
  });

  return { success: true, deliverable };
}

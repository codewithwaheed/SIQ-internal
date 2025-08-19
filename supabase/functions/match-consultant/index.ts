import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Keywords to expertise mapping
const EXPERTISE_KEYWORDS = {
  compliance: ['compliance', 'regulation', 'audit', 'NIST', 'SOC', 'HIPAA', 'GDPR', 'framework'],
  'incident-response': [
    'incident',
    'breach',
    'attack',
    'malware',
    'virus',
    'compromise',
    'forensics',
  ],
  'network-security': ['network', 'firewall', 'VPN', 'intrusion', 'monitoring', 'traffic'],
  'cloud-security': ['cloud', 'AWS', 'Azure', 'GCP', 'container', 'kubernetes', 'serverless'],
  'risk-assessment': ['risk', 'assessment', 'vulnerability', 'threat', 'analysis', 'evaluation'],
  NIST: ['NIST', 'cybersecurity framework', 'controls', 'standards'],
};

// Helper logging function
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MATCH-CONSULTANT] ${step}${detailsStr}`);
};

// Determine escalation type based on user query and context
function determineEscalationType(userQuery: string, messageLog: any[]): string {
  const allText = (userQuery + ' ' + messageLog.map((m) => m.content).join(' ')).toLowerCase();

  // Check for specific keywords
  for (const [expertise, keywords] of Object.entries(EXPERTISE_KEYWORDS)) {
    if (keywords.some((keyword) => allText.includes(keyword.toLowerCase()))) {
      return expertise;
    }
  }

  return 'technical'; // Default escalation type
}

// Find the best consultant for the escalation
async function matchConsultant(supabaseClient: any, escalationType: string, userQuery: string) {
  logStep('Starting consultant matching', { escalationType, query: userQuery });

  // Get available consultants with matching expertise
  const { data: consultants, error } = await supabaseClient
    .from('consultants')
    .select('*')
    .eq('availability_status', 'online')
    .order('last_assignment_at', { ascending: true, nullsFirst: true });

  if (error) {
    logStep('Error fetching consultants', { error: error.message });
    throw new Error(`Failed to fetch consultants: ${error.message}`);
  }

  if (!consultants || consultants.length === 0) {
    logStep('No online consultants available');
    throw new Error('No consultants are currently available. Please try again later.');
  }

  // Find consultants with matching expertise
  const matchingConsultants = consultants.filter(
    (consultant) =>
      consultant.expertise_areas && consultant.expertise_areas.includes(escalationType),
  );

  // If we have matching expertise, use those consultants
  // Otherwise, use any available consultant (round-robin)
  const candidateConsultants = matchingConsultants.length > 0 ? matchingConsultants : consultants;

  // Select consultant with least recent assignment
  const selectedConsultant = candidateConsultants[0];

  logStep('Selected consultant', {
    consultantId: selectedConsultant.user_id,
    name: `${selectedConsultant.first_name} ${selectedConsultant.last_name}`,
    expertise: selectedConsultant.expertise_areas,
    hasMatchingExpertise: matchingConsultants.length > 0,
  });

  return selectedConsultant;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Consultant matching request started');

    // Create Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user?.email) {
      throw new Error('User not authenticated or email not available');
    }

    // Parse request body
    const { escalationId, userQuery, messageLog } = await req.json();

    if (!escalationId) {
      throw new Error('Escalation ID is required');
    }

    logStep('Processing escalation', { escalationId, userId: user.id });

    // Determine escalation type based on content
    const escalationType = determineEscalationType(userQuery || '', messageLog || []);

    // Find the best consultant
    const selectedConsultant = await matchConsultant(
      supabaseClient,
      escalationType,
      userQuery || '',
    );

    // Update the escalation with consultant assignment
    const { data: updatedEscalation, error: updateError } = await supabaseClient
      .from('escalations')
      .update({
        assigned_consultant: selectedConsultant.user_id,
        escalation_type: escalationType,
        status: 'assigned',
        updated_at: new Date().toISOString(),
      })
      .eq('id', escalationId)
      .eq('user_id', user.id) // Ensure user can only update their own escalations
      .select()
      .single();

    if (updateError) {
      logStep('Failed to update escalation', { error: updateError.message });
      throw new Error(`Failed to assign consultant: ${updateError.message}`);
    }

    // Update consultant's assignment tracking
    const { error: consultantUpdateError } = await supabaseClient
      .from('profiles')
      .update({
        last_assignment_at: new Date().toISOString(),
        total_escalations_handled: selectedConsultant.total_escalations_handled + 1,
      })
      .eq('user_id', selectedConsultant.user_id);

    if (consultantUpdateError) {
      logStep('Warning: Failed to update consultant stats', {
        error: consultantUpdateError.message,
      });
    }

    // Add system message to conversation about consultant assignment
    if (updatedEscalation.session_id) {
      const systemMessage = `🔔 You have been connected to ${selectedConsultant.first_name} ${selectedConsultant.last_name}, a cybersecurity consultant specializing in ${selectedConsultant.expertise_areas?.join(', ') || 'security'}. They will review your conversation and respond shortly.`;

      const { error: messageError } = await supabaseClient.from('chat_messages').insert({
        conversation_id: updatedEscalation.session_id,
        role: 'system',
        content: systemMessage,
        timestamp: new Date().toISOString(),
      });

      if (messageError) {
        logStep('Warning: Failed to add system message', {
          error: messageError.message,
        });
      }
    }

    // Send notification to consultant (via edge function)
    try {
      await supabaseClient.functions.invoke('send-notification', {
        body: {
          type: 'consultant_assignment',
          escalation_id: escalationId,
          consultant_email: selectedConsultant.email,
          consultant_name: `${selectedConsultant.first_name} ${selectedConsultant.last_name}`,
          client_name: user.email,
          escalation_type: escalationType,
          user_query: userQuery,
        },
      });
    } catch (notificationError) {
      logStep('Warning: Failed to send consultant notification', {
        error: notificationError,
      });
    }

    logStep('Consultant matching completed successfully', {
      escalationId,
      consultantId: selectedConsultant.user_id,
      escalationType,
    });

    return new Response(
      JSON.stringify({
        success: true,
        escalation: updatedEscalation,
        consultant: {
          id: selectedConsultant.user_id,
          name: `${selectedConsultant.first_name} ${selectedConsultant.last_name}`,
          expertise: selectedConsultant.expertise_areas,
          escalation_type: escalationType,
        },
        message: `You've been connected to ${selectedConsultant.first_name} ${selectedConsultant.last_name}. They'll respond within 24 hours.`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    logStep('Error in match-consultant function', { error: error.message });
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EscalationRequest {
  sessionId: string;
  messageLog?: any[];
  reason?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with anon key to get authenticated user
    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
        global: {
          headers: {
            Authorization: req.headers.get('Authorization') ?? '',
          },
        },
      },
    );

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseAnon.auth.getUser();

    if (authError || !user?.email) {
      throw new Error('User not authenticated or email not available');
    }

    // Create service role client for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    // Check if user can escalate based on their subscription tier
    const { data: canEscalate, error: usageError } = await supabaseClient.rpc(
      'can_user_perform_action',
      {
        user_email: user.email,
        action_type: 'escalation',
      },
    );

    if (usageError) {
      throw new Error(`Failed to check escalation permissions: ${usageError.message}`);
    }

    if (!canEscalate) {
      throw new Error(
        'Escalation limit reached for your subscription tier. Please upgrade to Premium for consultant escalations.',
      );
    }

    // Parse request body
    const {
      sessionId,
      messageLog,
      reason,
      priority = 'normal',
    }: EscalationRequest = await req.json();

    if (!sessionId) {
      throw new Error('Session ID is required for escalation');
    }

    // Get session details for context
    const { data: sessionData, error: sessionError } = await supabaseClient
      .from('chat_conversations')
      .select('title')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError) {
      throw new Error('Session not found or access denied');
    }

    // Create escalation record
    const { data: escalationData, error: escalationError } = await supabaseClient
      .from('escalations')
      .insert({
        user_id: user.id,
        session_id: sessionId,
        message_log: messageLog || null,
        reason: reason || null,
        priority: priority,
        status: 'pending',
      })
      .select()
      .single();

    if (escalationError) {
      console.error('Database insert error:', escalationError);
      throw new Error(`Failed to create escalation: ${escalationError.message}`);
    }

    // Get user profile for notification context
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('first_name, last_name, email, company_name')
      .eq('user_id', user.id)
      .single();

    // Increment escalation count for the user
    const { error: incrementError } = await supabaseClient.rpc('increment_escalation_count', {
      user_email: user.email,
    });

    if (incrementError) {
      console.error('Failed to increment escalation count:', incrementError);
    }

    // Send notification to consultants and admins
    try {
      const clientName =
        profile?.first_name && profile?.last_name
          ? `${profile.first_name} ${profile.last_name}`
          : profile?.email || user.email;

      // Get consultant emails (you can expand this to get actual consultant emails from the database)
      const consultantEmails = ['consultant@example.com']; // Replace with actual consultant emails

      for (const consultantEmail of consultantEmails) {
        await supabaseClient.functions.invoke('send-notification', {
          body: {
            type: 'new_escalation',
            escalation_id: escalationData.id,
            consultant_email: consultantEmail,
            client_name: clientName,
            priority: priority,
            reason: reason,
            session_title: sessionData.title,
          },
        });
      }

      // Send notification to admin about new escalation
      if (Deno.env.get('RESEND_API_KEY')) {
        const resend = new (await import('npm:resend@2.0.0')).Resend(
          Deno.env.get('RESEND_API_KEY'),
        );

        await resend.emails.send({
          from: 'SentrIQ <noreply@sentriq.com>',
          to: ['eric@sentriq.io'],
          subject: `🚨 New ${priority.toUpperCase()} Priority Escalation Created`,
          html: `
            <h1>New Escalation Alert</h1>
            <p><strong>Client:</strong> ${clientName}</p>
            <p><strong>Company:</strong> ${profile?.company_name || 'N/A'}</p>
            <p><strong>Email:</strong> ${profile?.email || user.email}</p>
            <p><strong>Priority:</strong> ${priority}</p>
            <p><strong>Reason:</strong> ${reason}</p>
            <p><strong>Session:</strong> ${sessionData.title || 'N/A'}</p>
            <p><strong>Escalation ID:</strong> ${escalationData.id}</p>
            <br>
            <p>Please review and assign a consultant if needed.</p>
          `,
        });
      }
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError);
      // Don't fail the escalation if notification fails
    }

    console.log('Escalation created successfully:', escalationData);

    return new Response(
      JSON.stringify({
        success: true,
        escalation: escalationData,
        message:
          "Your request has been escalated to our cybersecurity consultants. You'll hear back within 24 hours.",
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error in escalate function:', error);
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

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-CONVERSATION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    logStep('Get conversation request started');

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header provided');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError) {
      throw new Error(`Authentication error: ${userError.message}`);
    }

    const user = userData.user;
    if (!user) {
      throw new Error('User not authenticated');
    }

    logStep('User authenticated', { userId: user.id });

    // Parse conversation ID from URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const conversationId = pathParts[pathParts.length - 1];

    if (!conversationId) {
      throw new Error('Conversation ID is required');
    }

    logStep('Request parsed', { conversationId });

    // Get conversation details
    const { data: conversation, error: convError } = await supabaseClient
      .from('chat_conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (convError) {
      if (convError.code === 'PGRST116') {
        throw new Error('Conversation not found or access denied');
      }
      throw new Error(`Failed to retrieve conversation: ${convError.message}`);
    }

    logStep('Retrieved conversation', {
      id: conversation.id,
      title: conversation.title,
    });

    // Get all messages for this conversation
    const { data: messages, error: msgError } = await supabaseClient
      .from('chat_messages')
      .select('id, role, content, timestamp, created_at')
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: true });

    if (msgError) {
      throw new Error(`Failed to retrieve messages: ${msgError.message}`);
    }

    logStep('Retrieved messages', { messageCount: messages?.length || 0 });

    // Get user's profile for additional context
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('user_id', user.id)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        conversation: {
          id: conversation.id,
          title: conversation.title,
          tags: conversation.tags,
          created_at: conversation.created_at,
          updated_at: conversation.updated_at,
          message_count: messages?.length || 0,
        },
        messages: messages || [],
        user_profile: profile || null,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR in get-conversation', { message: errorMessage });

    return new Response(
      JSON.stringify({
        error: errorMessage,
        success: false,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});

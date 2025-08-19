import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MANAGE-CONVERSATION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Manage conversation request started', { method: req.method });

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

    // Handle different HTTP methods
    if (req.method === 'GET') {
      // List all conversations for the user
      const url = new URL(req.url);
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      const { data: conversations, error } = await supabaseClient
        .from('chat_conversations')
        .select(
          `
          id,
          title,
          tags,
          created_at,
          updated_at,
          chat_messages(count)
        `,
        )
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Failed to retrieve conversations: ${error.message}`);
      }

      logStep('Retrieved conversations', { count: conversations?.length || 0 });

      return new Response(
        JSON.stringify({
          success: true,
          conversations: conversations || [],
          pagination: { limit, offset },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }

    // For PUT and DELETE, we need conversation ID
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const conversationId = pathParts[pathParts.length - 1];

    if (!conversationId) {
      throw new Error('Conversation ID is required');
    }

    // Verify user owns this conversation
    const { data: conversation, error: verifyError } = await supabaseClient
      .from('chat_conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (verifyError) {
      if (verifyError.code === 'PGRST116') {
        throw new Error('Conversation not found or access denied');
      }
      throw new Error(`Failed to verify conversation: ${verifyError.message}`);
    }

    if (req.method === 'PUT') {
      // Update conversation (title, tags)
      const { title, tags } = await req.json();

      const updateData: any = { updated_at: new Date().toISOString() };

      if (title !== undefined) {
        updateData.title = title;
      }

      if (tags !== undefined) {
        updateData.tags = tags;
      }

      const { data: updatedConv, error: updateError } = await supabaseClient
        .from('chat_conversations')
        .update(updateData)
        .eq('id', conversationId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update conversation: ${updateError.message}`);
      }

      logStep('Conversation updated', {
        id: conversationId,
        updates: updateData,
      });

      return new Response(
        JSON.stringify({
          success: true,
          conversation: updatedConv,
          message: 'Conversation updated successfully',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }

    if (req.method === 'DELETE') {
      // Delete conversation and all its messages

      // First delete all messages
      const { error: deleteMsgError } = await supabaseClient
        .from('chat_messages')
        .delete()
        .eq('conversation_id', conversationId);

      if (deleteMsgError) {
        throw new Error(`Failed to delete messages: ${deleteMsgError.message}`);
      }

      // Then delete the conversation
      const { error: deleteConvError } = await supabaseClient
        .from('chat_conversations')
        .delete()
        .eq('id', conversationId)
        .eq('user_id', user.id);

      if (deleteConvError) {
        throw new Error(`Failed to delete conversation: ${deleteConvError.message}`);
      }

      logStep('Conversation deleted', { id: conversationId });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Conversation deleted successfully',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }

    throw new Error(`Method ${req.method} not allowed`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR in manage-conversation', { message: errorMessage });

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

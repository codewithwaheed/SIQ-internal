import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEARCH-CHATS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Search request started');

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

    // Parse query parameters
    const url = new URL(req.url);
    const keyword = url.searchParams.get('keyword');
    const tag = url.searchParams.get('tag');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    logStep('Search parameters', { keyword, tag, limit, offset });

    // Build base query
    let conversationQuery = supabaseClient
      .from('chat_conversations')
      .select(
        `
        id,
        title,
        tags,
        created_at,
        updated_at,
        chat_messages!inner(
          role,
          content,
          timestamp
        )
      `,
      )
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    // Apply filters
    if (keyword) {
      // Search in conversation titles and message content
      conversationQuery = conversationQuery.or(
        `title.ilike.%${keyword}%,chat_messages.content.ilike.%${keyword}%`,
      );
    }

    if (tag) {
      conversationQuery = conversationQuery.contains('tags', [tag]);
    }

    // Apply pagination
    conversationQuery = conversationQuery.range(offset, offset + limit - 1);

    const { data: conversations, error: searchError } = await conversationQuery;

    if (searchError) {
      throw new Error(`Search failed: ${searchError.message}`);
    }

    logStep('Search completed', { resultCount: conversations?.length || 0 });

    // Format results - get recent messages for preview
    const formattedResults = await Promise.all(
      (conversations || []).map(async (conv) => {
        // Get recent messages for this conversation
        const { data: recentMessages } = await supabaseClient
          .from('chat_messages')
          .select('role, content, timestamp')
          .eq('conversation_id', conv.id)
          .order('timestamp', { ascending: false })
          .limit(3);

        // Create a preview from the first user message or title
        let preview = conv.title;
        if (recentMessages && recentMessages.length > 0) {
          const firstUserMessage = recentMessages.find((msg) => msg.role === 'user');
          if (firstUserMessage) {
            preview =
              firstUserMessage.content.substring(0, 150) +
              (firstUserMessage.content.length > 150 ? '...' : '');
          }
        }

        return {
          id: conv.id,
          title: conv.title,
          tags: conv.tags,
          preview,
          created_at: conv.created_at,
          updated_at: conv.updated_at,
          message_count: recentMessages?.length || 0,
          recent_messages: recentMessages?.slice(0, 2) || [], // Return 2 most recent for context
        };
      }),
    );

    // Get total count for pagination
    let countQuery = supabaseClient
      .from('chat_conversations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (keyword) {
      countQuery = countQuery.or(
        `title.ilike.%${keyword}%,chat_messages.content.ilike.%${keyword}%`,
      );
    }

    if (tag) {
      countQuery = countQuery.contains('tags', [tag]);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      logStep('Warning: Failed to get total count', {
        error: countError.message,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        results: formattedResults,
        pagination: {
          total: count || 0,
          limit,
          offset,
          has_more: (count || 0) > offset + limit,
        },
        filters: {
          keyword,
          tag,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR in search-chats', { message: errorMessage });

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

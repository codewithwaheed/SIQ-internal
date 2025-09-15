import 'https://deno.land/x/xhr@0.1.0/mod.ts';
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GENERATE-SUMMARY] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Summary generation request started');

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

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

    // Parse request body
    const { conversationId, messages } = await req.json();

    if (!conversationId || !messages) {
      throw new Error('conversationId and messages are required');
    }

    logStep('Request parsed', {
      conversationId,
      messageCount: messages.length,
    });

    // Verify user owns this conversation
    const { data: conversation, error: convError } = await supabaseClient
      .from('chat_conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (convError) {
      throw new Error(`Failed to retrieve conversation: ${convError.message}`);
    }

    // Generate summary using OpenAI
    const summaryPrompt = `Create a concise summary (max 200 words) of this cybersecurity conversation. Focus on:
- Key topics and frameworks discussed
- Current risk level and concerns
- Main compliance goals
- Implementation status

Messages:
${messages.map((m: any) => `${m.role}: ${m.content}`).join('\n\n')}

Summary:`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo-1106', // Use faster model for summaries
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful assistant that creates concise, professional summaries of cybersecurity conversations.',
          },
          { role: 'user', content: summaryPrompt },
        ],
        temperature: 0.3,
      max_completion_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const data = await response.json();
    const summary = data.choices[0].message.content;

    logStep('Summary generated', { summaryLength: summary.length });

    // Update conversation with summary
    const { error: updateError } = await supabaseClient
      .from('chat_conversations')
      .update({
        summary: summary,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    if (updateError) {
      throw new Error(`Failed to update conversation: ${updateError.message}`);
    }

    logStep('Summary saved successfully');

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        conversationId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    logStep('Error in generate-summary', { error: error.message });

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

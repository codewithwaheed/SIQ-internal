import 'https://deno.land/x/xhr@0.1.0/mod.ts';
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { securityHeaders } from '../_shared/security-utils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  ...securityHeaders,
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GENERATE-TITLE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Title generation request started');

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    // Create Supabase client for user authentication
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    // Create service role client for database updates
    const supabaseService = createClient(
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
    const { conversationId, messageContent } = await req.json();

    if (!conversationId || !messageContent) {
      throw new Error('Conversation ID and message content are required');
    }

    logStep('Request parsed', { conversationId });

    // Verify user owns this conversation using service role
    const { data: conversation, error: convError } = await supabaseService
      .from('chat_conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (convError) {
      throw new Error(`Failed to retrieve conversation: ${convError.message}`);
    }

    logStep('Conversation verified', { title: conversation.title });

    // Generate title and tags using OpenAI
    const titlePrompt = `Analyze this cybersecurity conversation start and generate:
1. A concise, descriptive title (max 50 characters)
2. 1-3 relevant tags from these categories: compliance, incident-response, policy, risk-assessment, network-security, data-protection, audit, training, vulnerability, encryption, access-control, monitoring, governance, framework, assessment

User message: "${messageContent}"

Respond in JSON format:
{
  "title": "Generated title here",
  "tags": ["tag1", "tag2", "tag3"]
}

Guidelines:
- Title should capture the main topic/question
- Use specific security terms when applicable 
- Include relevant standards (NIST, CMMC, SOC 2, etc.) if mentioned
- Tags should be lowercase and hyphenated
- Maximum 3 tags, minimum 1 tag`;

    logStep('Calling OpenAI for title generation');

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert at categorizing cybersecurity conversations. Generate concise, professional titles and relevant tags.',
          },
          {
            role: 'user',
            content: titlePrompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
        stream: false,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      throw new Error(`OpenAI API error: ${openAIResponse.status} - ${errorText}`);
    }

    const aiResponse = await openAIResponse.json();
    const aiContent = aiResponse.choices[0].message.content;

    logStep('Received AI response', { content: aiContent });

    // Parse the JSON response
    let titleData;
    try {
      titleData = JSON.parse(aiContent);
    } catch (parseError) {
      // Fallback to manual extraction if JSON parsing fails
      const titleMatch = aiContent.match(/"title":\s*"([^"]+)"/);
      const tagsMatch = aiContent.match(/"tags":\s*\[([^\]]+)\]/);

      titleData = {
        title: titleMatch ? titleMatch[1] : messageContent.slice(0, 50),
        tags: tagsMatch
          ? tagsMatch[1].split(',').map((tag: string) => tag.replace(/"/g, '').trim())
          : ['general'],
      };
    }

    // Ensure title is not too long
    if (titleData.title.length > 50) {
      titleData.title = titleData.title.slice(0, 47) + '...';
    }

    // Ensure we have valid tags
    if (!Array.isArray(titleData.tags) || titleData.tags.length === 0) {
      titleData.tags = ['general'];
    }

    logStep('Generated title data', titleData);

    // Update conversation with new title and tags using service role
    const { error: updateError } = await supabaseService
      .from('chat_conversations')
      .update({
        title: titleData.title,
        tags: titleData.tags,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    if (updateError) {
      throw new Error(`Failed to update conversation: ${updateError.message}`);
    }

    logStep('Conversation updated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        title: titleData.title,
        tags: titleData.tags,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR in generate-chat-title', { message: errorMessage });

    return new Response(
      JSON.stringify({
        error: 'Failed to generate title',
        success: false,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});

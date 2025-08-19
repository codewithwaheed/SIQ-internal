import 'https://deno.land/x/xhr@0.1.0/mod.ts';
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ANALYZE-FILES] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('File analysis request started');

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
    const { question, documentIds, analysisType = 'general' } = await req.json();

    if (!question) {
      throw new Error('Question is required');
    }

    logStep('Request parsed', {
      question: question.substring(0, 100),
      documentIds,
      analysisType,
    });

    // Get user's documents
    let documentsQuery = supabaseClient
      .from('documents')
      .select('id, file_name, file_type, content_extracted, uploaded_at')
      .eq('user_id', user.id)
      .not('content_extracted', 'is', null);

    // Filter by specific document IDs if provided
    if (documentIds && documentIds.length > 0) {
      documentsQuery = documentsQuery.in('id', documentIds);
    }

    const { data: documents, error: docError } = await documentsQuery;

    if (docError) {
      throw new Error(`Failed to retrieve documents: ${docError.message}`);
    }

    if (!documents || documents.length === 0) {
      throw new Error(
        'No documents found with extracted text. Please upload and process documents first.',
      );
    }

    logStep('Retrieved documents', { count: documents.length });

    // Prepare document context for AI
    const documentContext = documents
      .map(
        (doc) =>
          `File: ${doc.file_name} (${doc.file_type})\nUploaded: ${new Date(doc.uploaded_at).toLocaleDateString()}\nContent:\n${doc.content_extracted}\n`,
      )
      .join('\n---\n');

    // Prepare analysis prompt based on type
    let systemPrompt = '';

    switch (analysisType) {
      case 'security':
        systemPrompt = `You are a cybersecurity expert analyzing documents for security vulnerabilities, compliance issues, and risks. Focus on:
        - Security gaps and vulnerabilities
        - Compliance with frameworks (NIST, SOC2, CMMC, etc.)
        - Risk assessment and recommendations
        - Best practices implementation`;
        break;
      case 'compliance':
        systemPrompt = `You are a compliance specialist reviewing documents against cybersecurity frameworks and regulations. Focus on:
        - NIST 800-171, CMMC, SOC2, ISO 27001 compliance
        - Missing requirements and controls
        - Documentation gaps
        - Implementation recommendations`;
        break;
      case 'summary':
        systemPrompt = `You are a technical document analyst providing clear summaries. Focus on:
        - Key findings and important information
        - Executive summary of content
        - Action items and recommendations
        - Technical details in accessible language`;
        break;
      default:
        systemPrompt = `You are an AI assistant specializing in cybersecurity document analysis. Provide comprehensive analysis based on the user's question and the document content.`;
    }

    const messages = [
      {
        role: 'system',
        content: `${systemPrompt}

Guidelines:
- Provide specific, actionable insights based on the document content
- Reference specific sections or details from the documents when making points
- If documents contain sensitive information, be mindful in your analysis
- Suggest escalation to human consultants for complex security implementations
- Be thorough but concise in your analysis

Document Context:
${documentContext}`,
      },
      {
        role: 'user',
        content: question,
      },
    ];

    logStep('Calling OpenAI API for analysis', {
      documentCount: documents.length,
      analysisType,
      messageLength: messages[0].content.length,
    });

    // Call OpenAI API
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: messages,
        temperature: 0.3, // Lower temperature for more focused analysis
        max_tokens: 3000,
        stream: false,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      throw new Error(`OpenAI API error: ${openAIResponse.status} - ${errorText}`);
    }

    const aiResponse = await openAIResponse.json();
    const analysis = aiResponse.choices[0].message.content;

    logStep('Analysis completed', { responseLength: analysis.length });

    // Log the analysis for audit purposes
    const { error: logError } = await supabaseClient
      .from('chat_conversations')
      .insert({
        user_id: user.id,
        title: `File Analysis: ${question.substring(0, 50)}...`,
        tags: ['file-analysis', analysisType],
      })
      .select()
      .single()
      .then(async ({ data: conversation, error }) => {
        if (!error && conversation) {
          // Log the question and analysis as messages
          await supabaseClient.from('chat_messages').insert([
            {
              conversation_id: conversation.id,
              role: 'user',
              content: `File Analysis Request (${analysisType}): ${question}`,
              timestamp: new Date().toISOString(),
            },
            {
              conversation_id: conversation.id,
              role: 'assistant',
              content: analysis,
              timestamp: new Date().toISOString(),
            },
          ]);
        }
        return { error };
      });

    if (logError) {
      logStep('Warning: Failed to log analysis', { error: logError.message });
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis: analysis,
        documents_analyzed: documents.map((doc) => ({
          id: doc.id,
          name: doc.file_name,
          type: doc.file_type,
        })),
        analysis_type: analysisType,
        question: question,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR in analyze-files', { message: errorMessage });

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

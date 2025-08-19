import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, frameworkCategory, contentType, userId } = await req.json();

    if (!query) {
      throw new Error('Query is required');
    }

    console.log('Querying master knowledge base:', {
      query,
      frameworkCategory,
      contentType,
      userId
    });

    // Generate embedding for the query
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: query,
      }),
    });

    if (!embeddingResponse.ok) {
      throw new Error(`OpenAI API error: ${embeddingResponse.statusText}`);
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // Search master knowledge base embeddings
    let masterKnowledgeQuery = supabase
      .from('master_knowledge_embeddings')
      .select(`
        *,
        master_knowledge_base!inner(
          id,
          title,
          description,
          content_type,
          framework_category,
          file_name,
          tags,
          version
        )
      `)
      .order('embedding <-> $1', { ascending: true })
      .limit(10);

    // Apply filters if provided
    if (frameworkCategory) {
      masterKnowledgeQuery = masterKnowledgeQuery.eq('master_knowledge_base.framework_category', frameworkCategory);
    }
    if (contentType) {
      masterKnowledgeQuery = masterKnowledgeQuery.eq('master_knowledge_base.content_type', contentType);
    }

    const { data: masterResults, error: masterError } = await masterKnowledgeQuery;

    if (masterError) {
      console.error('Master knowledge query error:', masterError);
      throw new Error('Failed to query master knowledge base');
    }

    console.log(`Found ${masterResults?.length || 0} master knowledge results`);

    // If user is provided, also search their personal documents for comparison
    let userResults = [];
    if (userId) {
      try {
        const { data: userDocs, error: userError } = await supabase.functions
          .invoke('query-vectors', {
            body: { 
              query,
              userId,
              limit: 5
            }
          });

        if (!userError && userDocs?.success) {
          userResults = userDocs.results || [];
        }
      } catch (error) {
        console.log('User document query failed, continuing with master knowledge only:', error);
      }
    }

    // Format and rank results
    const masterKnowledgeResults = (masterResults || []).map((result: any) => ({
      id: result.id,
      source: 'master_knowledge',
      title: result.master_knowledge_base.title,
      description: result.master_knowledge_base.description,
      content: result.chunk_text,
      framework_category: result.master_knowledge_base.framework_category,
      content_type: result.master_knowledge_base.content_type,
      file_name: result.master_knowledge_base.file_name,
      tags: result.master_knowledge_base.tags,
      version: result.master_knowledge_base.version,
      chunk_index: result.chunk_index,
      relevance_score: calculateRelevanceScore(result, queryEmbedding)
    }));

    // Format user results for comparison
    const userDocumentResults = userResults.map((result: any) => ({
      ...result,
      source: 'user_document'
    }));

    // Generate analysis and recommendations
    const analysis = await generateKnowledgeAnalysis(
      query,
      masterKnowledgeResults.slice(0, 5), // Top 5 master knowledge results
      userDocumentResults.slice(0, 3)     // Top 3 user document results
    );

    return new Response(JSON.stringify({
      success: true,
      query,
      masterKnowledgeResults,
      userDocumentResults,
      analysis,
      totalMasterResults: masterKnowledgeResults.length,
      totalUserResults: userDocumentResults.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in query-master-knowledge function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function calculateRelevanceScore(result: any, queryEmbedding: number[]): number {
  // Simple cosine similarity calculation
  const embedding = result.embedding;
  if (!embedding || !Array.isArray(embedding)) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < Math.min(embedding.length, queryEmbedding.length); i++) {
    dotProduct += embedding[i] * queryEmbedding[i];
    normA += embedding[i] * embedding[i];
    normB += queryEmbedding[i] * queryEmbedding[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function generateKnowledgeAnalysis(
  query: string, 
  masterResults: any[], 
  userResults: any[]
): Promise<any> {
  if (!openAIApiKey) {
    return {
      summary: "Knowledge base search completed",
      recommendations: ["Review the found documents for relevant information"],
      comparisons: []
    };
  }

  try {
    const prompt = `Analyze the following cybersecurity knowledge query and provide insights:

Query: "${query}"

Master Knowledge Base Results (Official Framework Content):
${masterResults.map((r, i) => `${i + 1}. [${r.framework_category}] ${r.title} - ${r.content.substring(0, 200)}...`).join('\n')}

User Document Results (User-Specific Content):
${userResults.map((r, i) => `${i + 1}. ${r.title || r.file_name} - ${r.content.substring(0, 200)}...`).join('\n')}

Please provide:
1. A summary of what the official frameworks say about this topic
2. Key recommendations based on best practices
3. If user documents exist, compare them to official guidance and note any gaps or improvements needed
4. Specific action items or next steps

Format as JSON with keys: summary, recommendations (array), comparisons (array), actionItems (array)`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a cybersecurity compliance expert. Analyze knowledge base results and provide actionable insights in JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI analysis failed: ${response.statusText}`);
    }

    const analysisData = await response.json();
    const analysisText = analysisData.choices[0].message.content;
    
    try {
      return JSON.parse(analysisText);
    } catch {
      // Fallback if JSON parsing fails
      return {
        summary: analysisText,
        recommendations: ["Review the provided analysis"],
        comparisons: [],
        actionItems: []
      };
    }

  } catch (error) {
    console.error('Error generating analysis:', error);
    return {
      summary: "Analysis generation failed, but knowledge base results are available",
      recommendations: ["Review the found documents manually"],
      comparisons: [],
      actionItems: []
    };
  }
}
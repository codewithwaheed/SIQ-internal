import 'https://deno.land/x/xhr@0.1.0/mod.ts';
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate embedding for query
async function generateQueryEmbedding(query: string): Promise<number[]> {
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small', // Use the newer available model
      input: query,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${await response.text()}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// Query Pinecone for similar vectors
async function queryPinecone(embedding: number[], userId: string, topK = 3) {
  const pineconeKey = Deno.env.get('PINECONE_API_KEY');
  const pineconeEnv = Deno.env.get('PINECONE_ENVIRONMENT') || 'us-east-1-aws';
  const pineconeIndex = Deno.env.get('PINECONE_INDEX') || 'sentrIQ-doc-index';

  if (!pineconeKey) {
    throw new Error('Pinecone API key not configured');
  }

  const queryData = {
    vector: embedding,
    topK: topK,
    includeMetadata: true,
    filter: {
      user_id: userId,
    },
  };

  const response = await fetch(
    `https://${pineconeIndex}-${pineconeEnv}.svc.${pineconeEnv}.pinecone.io/query`,
    {
      method: 'POST',
      headers: {
        'Api-Key': pineconeKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(queryData),
    },
  );

  if (!response.ok) {
    throw new Error(`Pinecone query error: ${await response.text()}`);
  }

  return await response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, userId, topK = 3 } = await req.json();

    if (!query || !userId) {
      throw new Error('Missing required parameters: query, userId');
    }

    console.log(`[QUERY-VECTORS] Searching for: "${query}" for user ${userId}`);

    try {
      // Generate embedding for the query
      const queryEmbedding = await generateQueryEmbedding(query);

      // Query Pinecone for similar vectors
      const results = await queryPinecone(queryEmbedding, userId, topK);

      // Extract relevant text chunks
      const relevantChunks =
        results.matches?.map((match: any) => ({
          text: match.metadata?.text || '',
          score: match.score || 0,
          document_id: match.metadata?.document_id || '',
          chunk_index: match.metadata?.chunk_index || 0,
        })) || [];

      console.log(`[QUERY-VECTORS] Found ${relevantChunks.length} relevant chunks`);

      return new Response(
        JSON.stringify({
          success: true,
          relevant_chunks: relevantChunks,
          query: query,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    } catch (vectorError) {
      console.error('Vector search error:', vectorError);

      // Fallback: return empty results instead of failing
      return new Response(
        JSON.stringify({
          success: true,
          relevant_chunks: [],
          query: query,
          fallback: true,
          warning: 'Vector search unavailable, using fallback mode',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }
  } catch (error) {
    console.error('Error in query-vectors function:', error);
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

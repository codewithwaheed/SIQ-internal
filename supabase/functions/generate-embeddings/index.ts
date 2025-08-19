import 'https://deno.land/x/xhr@0.1.0/mod.ts';
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Chunk text into smaller pieces for embedding
function chunkText(text: string, maxChunkSize = 1000): string[] {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (currentChunk.length + trimmedSentence.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = trimmedSentence;
    } else {
      currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter((chunk) => chunk.length > 50); // Filter out very short chunks
}

// Generate embedding using OpenAI
async function generateEmbedding(text: string): Promise<number[]> {
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
      model: 'text-embedding-ada-002', // Using consistent model with main system
      input: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${await response.text()}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentId, text, userId, tableType = 'documents' } = await req.json();

    if (!documentId || !text) {
      throw new Error('Missing required parameters: documentId, text');
    }

    console.log(`[GENERATE-EMBEDDINGS] Processing document ${documentId}`);

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    // Chunk the text
    const chunks = chunkText(text);
    console.log(`[GENERATE-EMBEDDINGS] Created ${chunks.length} chunks`);

    let successCount = 0;
    let errorCount = 0;

    // Determine which embeddings table to use
    const embeddingsTable =
      tableType === 'master_knowledge_base' ? 'master_knowledge_embeddings' : 'document_embeddings';

    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      try {
        const chunk = chunks[i];

        // Generate embedding
        const embedding = await generateEmbedding(chunk);

        // Store in Supabase vector database
        const embeddingRecord =
          tableType === 'master_knowledge_base'
            ? {
                master_document_id: documentId,
                chunk_text: chunk,
                chunk_index: i,
                embedding,
                metadata: {
                  chunk_size: chunk.length,
                  total_chunks: chunks.length,
                },
              }
            : {
                document_id: documentId,
                user_id: userId,
                chunk_text: chunk,
                chunk_index: i,
                embedding,
                metadata: {
                  chunk_size: chunk.length,
                  total_chunks: chunks.length,
                },
              };

        const { error: insertError } = await supabaseClient
          .from(embeddingsTable)
          .insert(embeddingRecord);

        if (insertError) {
          throw new Error(`Failed to insert embedding: ${insertError.message}`);
        }

        successCount++;
        console.log(`[GENERATE-EMBEDDINGS] Processed chunk ${i + 1}/${chunks.length}`);

        // Small delay to avoid rate limits
        if (i < chunks.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`[GENERATE-EMBEDDINGS] Error processing chunk ${i}:`, error);
        errorCount++;
      }
    }

    // Update document status in appropriate table
    const updateTable =
      tableType === 'master_knowledge_base' ? 'master_knowledge_base' : 'documents';
    const { error: updateError } = await supabaseClient
      .from(updateTable)
      .update({
        processing_status: errorCount === 0 ? 'completed' : 'failed',
        processed_at: new Date().toISOString(),
      })
      .eq('id', documentId);

    if (updateError) {
      console.error('Failed to update document status:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed_chunks: successCount,
        failed_chunks: errorCount,
        total_chunks: chunks.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error in generate-embeddings function:', error);
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

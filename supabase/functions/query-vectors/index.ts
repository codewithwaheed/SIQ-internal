import 'https://deno.land/x/xhr@0.1.0/mod.ts';
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function resolveModelFallbacks(primary?: string): string[] {
  const allow = (Deno.env.get('EMBEDDING_MODEL_ALLOWLIST') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (allow.length > 0) {
    const list = (primary && primary.trim().length ? [primary.trim(), ...allow] : allow).filter(
      (v, i, a) => a.indexOf(v) === i,
    );
    return list;
  }
  const defaults = ['text-embedding-3-small', 'text-embedding-ada-002', 'text-embedding-3-large'];
  const list = (primary && primary.trim().length ? [primary.trim(), ...defaults] : defaults).filter(
    (v, i, a) => a.indexOf(v) === i,
  );
  return list;
}

// Generate embedding for query (with model fallbacks)
function fakeEmbed(text: string, dim: number): number[] {
  const vec = new Array<number>(dim).fill(0);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    vec[code % dim] += 1;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

async function generateQueryEmbedding(query: string): Promise<number[]> {
  const DISABLE = (Deno.env.get('DISABLE_EMBEDDINGS') || '').toLowerCase() === '1';
  if (DISABLE) {
    const dim = parseInt(Deno.env.get('EMBEDDING_DIM') ?? '256', 10) || 256;
    return fakeEmbed(query, dim);
  }

  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const primary = Deno.env.get('EMBEDDING_MODEL') ?? 'text-embedding-3-small';
  const models = resolveModelFallbacks(primary);
  let lastErr: any = null;
  console.log('[QUERY-VECTORS] Trying embedding models (in order):', models.join(', '));
  for (const model of models) {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model, input: query }),
      });
      if (response.ok) {
        const data = await response.json();
        return data.data[0].embedding;
      }
      const txt = await response.text();
      lastErr = new Error(`OpenAI API error: ${txt}`);
      if (txt.includes('model_not_found') || txt.includes('does not have access to model')) continue;
      throw lastErr;
    } catch (e) {
      lastErr = e;
    }
  }
  // As a last resort, generate a fake vector so local dev continues
  const dim = parseInt(Deno.env.get('EMBEDDING_DIM') ?? '256', 10) || 256;
  console.warn('[QUERY-VECTORS] Falling back to fake embeddings for query');
  return fakeEmbed(query, dim);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      query,
      userId,
      conversationId,
      activeDocuments,
      topK = 5,
    } = await req.json();

    if (!query || !userId) {
      throw new Error('Missing required parameters: query, userId');
    }

    const QDRANT_URL = Deno.env.get('QDRANT_URL') ?? '';
    const QDRANT_API_KEY = Deno.env.get('QDRANT_API_KEY') ?? undefined;
    const QDRANT_COLLECTION = Deno.env.get('QDRANT_COLLECTION') ?? 'user_docs';
    if (!QDRANT_URL) throw new Error('QDRANT_URL not configured');

    console.log(`[QUERY-VECTORS] Qdrant search for: "${query}" user=${userId} conv=${conversationId ?? 'n/a'}`);

    // Generate embedding for the query
    let queryEmbedding: number[];
    try {
      queryEmbedding = await generateQueryEmbedding(query);
    } catch (e) {
      console.error('[QUERY-VECTORS] Embedding error; returning empty results:', e);
      return new Response(
        JSON.stringify({ success: true, relevant_chunks: [], query, fallback: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      );
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (QDRANT_API_KEY) headers['api-key'] = QDRANT_API_KEY;

    const must: any[] = [{ key: 'user_id', match: { value: userId } }];
    // If specific documents are attached, restrict to them; otherwise, prefer conversation scope
    if (Array.isArray(activeDocuments) && activeDocuments.length > 0) {
      must.push({ key: 'doc_id', match: { any: activeDocuments } });
    } else if (conversationId) {
      must.push({ key: 'conversation_id', match: { value: conversationId } });
    }

    // Helper to ensure payload indexes if Qdrant requests them
    async function getPayloadSchema(): Promise<Record<string, any>> {
      try {
        const info = await fetch(`${QDRANT_URL}/collections/${QDRANT_COLLECTION}`);
        if (!info.ok) return {};
        const data = await info.json();
        return data?.result?.payload_schema ?? {};
      } catch {
        return {};
      }
    }

    async function ensurePayloadIndexes() {
      const existing = await getPayloadSchema();
      const idxEndpoint = `${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points/index`;
      const toEnsure = ['user_id', 'conversation_id', 'doc_id'];
      for (const field of toEnsure) {
        if (existing && existing[field]) continue;
        try {
          const body = { field_name: field, field_schema: 'keyword' };
          const r = await fetch(idxEndpoint, { method: 'PUT', headers, body: JSON.stringify(body) });
          if (!r.ok) {
            const t = await r.text();
            if (!/already exists|Index exists/i.test(String(t))) {
              console.warn('[QUERY-VECTORS] Index create warn:', t);
            }
          }
          // Poll until index appears (best-effort)
          for (let i = 0; i < 10; i++) {
            const schema = await getPayloadSchema();
            if (schema && schema[field]) break;
            await new Promise((res) => setTimeout(res, 200));
          }
        } catch (e) {
          console.warn('[QUERY-VECTORS] Failed to ensure index', field, e);
        }
      }
    }

    async function doSearch() {
      return fetch(`${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points/search`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          vector: queryEmbedding,
          limit: Math.max(1, Math.min(20, topK)),
          with_payload: true,
          filter: { must },
          score_threshold: 0.0,
        }),
      });
    }

    let searchRes = await doSearch();
    if (!searchRes.ok) {
      const err = await searchRes.text();
      if (err.includes('Index required but not found')) {
        console.warn('[QUERY-VECTORS] Missing payload index. Creating and retrying once.');
        await ensurePayloadIndexes();
        searchRes = await doSearch();
      }
    }

    if (!searchRes.ok) {
      const err = await searchRes.text();
      console.error('[QUERY-VECTORS] Qdrant search error:', err);
      return new Response(
        JSON.stringify({ success: true, relevant_chunks: [], query, fallback: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      );
    }

    const searchData = await searchRes.json();
    const matches = (searchData?.result ?? []) as Array<{
      id: string;
      score: number;
      payload?: any;
    }>;

    const relevant_chunks = matches.map((m) => ({
      text: m.payload?.text ?? '',
      score: m.score ?? 0,
      doc_id: m.payload?.doc_id ?? '',
      file_name: m.payload?.file_name ?? '',
      chunk_id: m.payload?.chunk_id ?? 0,
      conversation_id: m.payload?.conversation_id ?? null,
    }));

    console.log(`[QUERY-VECTORS] Found ${relevant_chunks.length} chunks`);

    return new Response(
      JSON.stringify({ success: true, relevant_chunks, query }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
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

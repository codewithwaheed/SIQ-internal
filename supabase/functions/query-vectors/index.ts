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

async function generateQueryEmbedding(query: string): Promise<number[]> {
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
  throw lastErr || new Error('Failed to generate query embedding');
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
      mode,
    } = await req.json();

    if (!query || !userId) {
      throw new Error('Missing required parameters: query, userId');
    }

    const QDRANT_URL = Deno.env.get('QDRANT_URL') ?? '';
    const QDRANT_API_KEY = Deno.env.get('QDRANT_API_KEY') ?? undefined;
    const QDRANT_COLLECTION = Deno.env.get('QDRANT_COLLECTION') ?? 'user_docs';
    if (!QDRANT_URL) throw new Error('QDRANT_URL not configured');

    console.log(
      `[QUERY-VECTORS] Qdrant search for: "${query}" user=${userId} conv=${conversationId ?? 'n/a'} | mode=${mode ?? 'vector'} | collection=${QDRANT_COLLECTION}`,
    );
    if (Array.isArray(activeDocuments) && activeDocuments.length > 0) {
      console.log(`[QUERY-VECTORS] Restricting to docs: ${activeDocuments.join(',')}`);
    }

    // If no documents are explicitly attached, skip retrieval entirely.
    // This avoids unnecessary embedding/Qdrant calls when a general answer is sufficient.
    if (!Array.isArray(activeDocuments) || activeDocuments.length === 0) {
      return new Response(
        JSON.stringify({ success: true, relevant_chunks: [], query, skipped: 'no_active_documents' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      );
    }

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
        const info = await fetch(`${QDRANT_URL}/collections/${QDRANT_COLLECTION}` , { headers });
        if (!info.ok) return {};
        const data = await info.json();
        return data?.result?.payload_schema ?? {};
      } catch {
        return {};
      }
    }

    async function ensurePayloadIndexes() {
      const existing = await getPayloadSchema();
      try {
        const keys = Object.keys(existing || {});
        console.log('[QUERY-VECTORS] Existing payload_schema keys:', keys.length ? keys.join(',') : '(none)');
      } catch {}
      // Correct Qdrant payload index endpoint (no /points)
      const idxEndpoint = `${QDRANT_URL}/collections/${QDRANT_COLLECTION}/index`;
      const toEnsure = ['user_id', 'conversation_id', 'doc_id'];
      for (const field of toEnsure) {
        if (existing && existing[field]) continue;
        try {
          // Prefer uuid type, fallback to keyword
          console.log(`[QUERY-VECTORS] Creating payload index field=${field} as uuid`);
          let r = await fetch(idxEndpoint + '?wait=true', {
            method: 'PUT',
            headers,
            body: JSON.stringify({ field_name: field, field_schema: { type: 'uuid' } }),
          });
          if (!r.ok) {
            const t = await r.text();
            console.warn(`[QUERY-VECTORS] Index create warn (uuid) status=${r.status}:`, t);
            // Some Qdrant versions expect POST instead of PUT
            if (r.status === 404) {
              r = await fetch(idxEndpoint + '?wait=true', {
                method: 'POST',
                headers,
                body: JSON.stringify({ field_name: field, field_schema: { type: 'uuid' } }),
              });
            }
            r = await fetch(idxEndpoint + '?wait=true', {
              method: 'PUT',
              headers,
              body: JSON.stringify({ field_name: field, field_schema: { type: 'keyword' } }),
            });
            if (!r.ok) {
              const t2 = await r.text();
              console.warn(`[QUERY-VECTORS] Index create warn (keyword obj) status=${r.status}:`, t2);
              if (r.status === 404) {
                r = await fetch(idxEndpoint + '?wait=true', {
                  method: 'POST',
                  headers,
                  body: JSON.stringify({ field_name: field, field_schema: { type: 'keyword' } }),
                });
              }
              // Final fallback: legacy string schema
              const r3 = await fetch(idxEndpoint + '?wait=true', {
                method: 'PUT',
                headers,
                body: JSON.stringify({ field_name: field, field_schema: 'keyword' }),
              });
              if (!r3.ok) {
                const t3 = await r3.text();
                console.warn(`[QUERY-VECTORS] Index create warn (keyword str) status=${r3.status}:`, t3);
                if (r3.status === 404) {
                  const r4 = await fetch(idxEndpoint + '?wait=true', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ field_name: field, field_schema: 'keyword' }),
                  });
                  if (!r4.ok) {
                    const t4 = await r4.text();
                    console.warn(`[QUERY-VECTORS] Index create warn (keyword str, POST) status=${r4.status}:`, t4);
                  }
                }
              }
            }
          }
          // Poll until index appears (best-effort)
          for (let i = 0; i < 25; i++) {
            const schema = await getPayloadSchema();
            if (schema && schema[field]) break;
            await new Promise((res) => setTimeout(res, 200));
          }
          const after = await getPayloadSchema();
          try {
            console.log('[QUERY-VECTORS] Payload_schema after ensure keys:', Object.keys(after || {}).join(','));
          } catch {}
        } catch (e) {
          console.warn('[QUERY-VECTORS] Failed to ensure index', field, e);
        }
      }
    }

    async function doSearch() {
      console.log('[QUERY-VECTORS] Building vector search with filter.must');
      try { console.log(JSON.stringify({ must }, null, 2)); } catch {}
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

    // Whole-document path (summarize/analyze): fetch ordered chunks without vector search
    if (mode === 'doc_scroll' && Array.isArray(activeDocuments) && activeDocuments.length > 0) {
      await ensurePayloadIndexes();
      const scrollRes = await fetch(`${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points/scroll`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          filter: { must },
          with_payload: true,
          limit: Math.max(10, Math.min(200, topK * 4)),
        }),
      });
      if (!scrollRes.ok) {
        const err = await scrollRes.text();
        console.error('[QUERY-VECTORS] Qdrant scroll error:', err);
        // Fallback: if user_id index is missing, try doc_id-only filter (ownership already verified upstream)
        if (/Index required.*"user_id"/i.test(err)) {
          const mustDocOnly: any[] = [{ key: 'doc_id', match: { any: activeDocuments } }];
          const scrollRes2 = await fetch(`${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points/scroll`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              filter: { must: mustDocOnly },
              with_payload: true,
              limit: Math.max(10, Math.min(200, topK * 4)),
            }),
          });
          if (scrollRes2.ok) {
            const scrollData = await scrollRes2.json();
            const pts = (scrollData?.result?.points ?? []) as Array<{ payload?: any }>;
            const ordered = pts
              .map((p) => ({
                text: p?.payload?.text ?? '',
                score: 1,
                doc_id: p?.payload?.doc_id ?? '',
                file_name: p?.payload?.file_name ?? '',
                chunk_id: p?.payload?.chunk_id ?? 0,
                conversation_id: p?.payload?.conversation_id ?? null,
              }))
              .sort((a, b) => (a.doc_id === b.doc_id ? a.chunk_id - b.chunk_id : a.doc_id.localeCompare(b.doc_id)))
              .slice(0, Math.max(10, Math.min(100, topK * 4)));
            return new Response(
              JSON.stringify({ success: true, relevant_chunks: ordered, query, degraded: true }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
            );
          }
        }
        return new Response(
          JSON.stringify({ success: true, relevant_chunks: [], query, fallback: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
        );
      }
      const scrollData = await scrollRes.json();
      const pts = (scrollData?.result?.points ?? []) as Array<{ payload?: any }>; // deno-lint-ignore no-explicit-any
      const ordered = pts
        .map((p) => ({
          text: p?.payload?.text ?? '',
          score: 1,
          doc_id: p?.payload?.doc_id ?? '',
          file_name: p?.payload?.file_name ?? '',
          chunk_id: p?.payload?.chunk_id ?? 0,
          conversation_id: p?.payload?.conversation_id ?? null,
        }))
        .sort((a, b) => (a.doc_id === b.doc_id ? a.chunk_id - b.chunk_id : a.doc_id.localeCompare(b.doc_id)))
        .slice(0, Math.max(10, Math.min(100, topK * 4)));
      return new Response(
        JSON.stringify({ success: true, relevant_chunks: ordered, query }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      );
    }

    let searchRes = await doSearch();
    if (!searchRes.ok) {
      const err = await searchRes.text();
      if (err.includes('Index required but not found')) {
        console.warn('[QUERY-VECTORS] Missing payload index. Creating and retrying once.');
        await ensurePayloadIndexes();
        searchRes = await doSearch();
        if (!searchRes.ok && /Index required.*"user_id"/i.test(err) && Array.isArray(activeDocuments) && activeDocuments.length > 0) {
          // Secondary fallback: remove user_id from filter but keep doc_id restriction
          const mustDocOnly: any[] = [{ key: 'doc_id', match: { any: activeDocuments } }];
          console.warn('[QUERY-VECTORS] Fallback to doc_id-only filter (dropping user_id)');
          try { console.log(JSON.stringify({ must: mustDocOnly }, null, 2)); } catch {}
          searchRes = await fetch(`${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points/search`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              vector: queryEmbedding,
              limit: Math.max(1, Math.min(20, topK)),
              with_payload: true,
              filter: { must: mustDocOnly },
              score_threshold: 0.0,
            }),
          });
        }
      }
    }

    if (!searchRes.ok) {
      const err = await searchRes.text();
      console.error('[QUERY-VECTORS] Qdrant search error:', err);
      try {
        const schema = await getPayloadSchema();
        console.log('[QUERY-VECTORS] Current payload_schema keys at failure:', Object.keys(schema || {}).join(','));
      } catch {}
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

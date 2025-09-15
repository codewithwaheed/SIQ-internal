import 'https://deno.land/x/xhr@0.1.0/mod.ts';
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

type IndexRequest = {
  docId: string;
  // Optionally force re-index regardless of existing hashes
  force?: boolean;
  // Optional chunking config overrides
  chunk_size?: number;
  chunk_overlap?: number;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function hashString(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function chunkTextWithOverlap(text: string, size: number, overlap: number): string[] {
  const chunks: string[] = [];
  if (size <= 0) return chunks;
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 0) chunks.push(chunk);
    if (end === text.length) break;
    start = end - Math.min(overlap, end - start);
  }
  return chunks;
}

async function ensureQdrantCollection(baseUrl: string, apiKey: string | undefined, collection: string, vectorSize: number) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['api-key'] = apiKey;
  try {
    const getRes = await fetch(`${baseUrl}/collections/${collection}`);
    if (getRes.ok) return; // exists
  } catch (_) {
    // continue to try create
  }
  await fetch(`${baseUrl}/collections/${collection}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      vectors: { size: vectorSize, distance: 'Cosine' },
      optimizers_config: { default_segment_number: 2 },
    }),
  });
}

async function ensureQdrantPayloadIndexes(baseUrl: string, apiKey: string | undefined, collection: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['api-key'] = apiKey;
  const endpoint = `${baseUrl}/collections/${collection}/points/index`;
  const indexes: Array<{ field_name: string; field_schema: any }> = [
    { field_name: 'user_id', field_schema: { type: 'uuid' } },
    { field_name: 'conversation_id', field_schema: { type: 'uuid' } },
    { field_name: 'doc_id', field_schema: { type: 'uuid' } },
  ];
  for (const idx of indexes) {
    try {
      const res = await fetch(endpoint, { method: 'PUT', headers, body: JSON.stringify(idx) });
      if (!res.ok) {
        const t = await res.text();
        // Ignore errors about existing index or unsupported schema variants
        if (!/already exists|Index exists/i.test(t)) console.warn('[qdrant-index] Index create warn:', t);
      }
    } catch (e) {
      console.warn('[qdrant-index] Failed to ensure payload index', idx.field_name, e);
    }
  }
}

async function embedText(openaiKey: string, text: string, model: string): Promise<number[]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, input: text }),
  });
  if (!res.ok) throw new Error(`OpenAI Embeddings error: ${await res.text()}`);
  const data = await res.json();
  return data.data[0].embedding as number[];
}

function resolveModelFallbacks(primary?: string): string[] {
  // Optional explicit allowlist (comma separated), e.g.: "text-embedding-ada-002,text-embedding-3-small"
  const allow = (Deno.env.get('EMBEDDING_MODEL_ALLOWLIST') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (allow.length > 0) {
    // Prepend primary if provided and not already in list
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const QDRANT_URL = Deno.env.get('QDRANT_URL') ?? '';
    const QDRANT_API_KEY = Deno.env.get('QDRANT_API_KEY') ?? undefined;
    const QDRANT_COLLECTION = Deno.env.get('QDRANT_COLLECTION') ?? 'user_docs';
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
    const EMBEDDING_MODEL = Deno.env.get('EMBEDDING_MODEL') ?? 'text-embedding-3-small';
    const EMBEDDING_DIM = parseInt(Deno.env.get('EMBEDDING_DIM') ?? '0', 10) || null;
    const DEFAULT_CHUNK_SIZE = parseInt(Deno.env.get('CHUNK_SIZE') ?? '1200', 10);
    const DEFAULT_CHUNK_OVERLAP = parseInt(Deno.env.get('CHUNK_OVERLAP') ?? '200', 10);

    if (!QDRANT_URL || !OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Missing QDRANT_URL or OPENAI_API_KEY' }),
        { status: 500, headers: corsHeaders },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    const { docId, force, chunk_size, chunk_overlap } = (await req.json()) as IndexRequest;
    if (!docId) {
      return new Response(JSON.stringify({ error: 'docId is required' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('id, user_id, file_name, file_path, file_type, content_extracted')
      .eq('id', docId)
      .single();
    if (docError || !doc) {
      return new Response(JSON.stringify({ error: 'Document not found' }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    // Get text content
    let text: string | null = doc.content_extracted as string | null;
    if (!text || text.length < 10) {
      if (doc.file_type === 'text/plain') {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('user-documents')
          .download(doc.file_path);
        if (downloadError || !fileData) throw new Error('Failed to download text file');
        text = (await fileData.text()).replace(/\s+/g, ' ').trim();
      } else {
        const { data: extractResult, error: extractError } = await supabase.functions.invoke(
          'extract-text',
          { body: { filePath: doc.file_path, fileType: doc.file_type } },
        );
        if (extractError || !extractResult?.success) throw new Error('Text extraction failed');
        text = String(extractResult.extractedText || '').replace(/\s+/g, ' ').trim();
      }
    }
    if (!text || text.length < 10) {
      return new Response(JSON.stringify({ error: 'No extractable text in document' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const size = Math.max(200, chunk_size ?? DEFAULT_CHUNK_SIZE);
    const overlap = Math.max(0, Math.min(size - 1, chunk_overlap ?? DEFAULT_CHUNK_OVERLAP));
    const chunks = chunkTextWithOverlap(text, size, overlap);

    // Determine embedding vector size by probing once; handle quota and model access errors gracefully
    let vectorSize: number | null = null;
    let selectedModel: string | null = null;
    try {
      const candidates = resolveModelFallbacks(EMBEDDING_MODEL);
      let lastErr: any = null;
      console.log('[qdrant-index] Trying embedding models (in order):', candidates.join(', '));
      for (const m of candidates) {
        try {
          const probe = await embedText(OPENAI_API_KEY, chunks[0].slice(0, 1000), m);
          vectorSize = probe.length;
          selectedModel = m;
          break;
        } catch (err) {
          const msg = String((err as Error).message || err);
          lastErr = err;
          if (msg.includes('model_not_found') || msg.includes('does not have access to model')) {
            console.warn('[qdrant-index] Model not accessible:', m);
            continue; // try next model
          }
          throw err;
        }
      }
      if (!selectedModel || !vectorSize) throw lastErr || new Error('No embedding model available');
    } catch (e) {
      const msg = String((e as Error).message || e);
      if (msg.includes('insufficient_quota')) {
        // If we know the dimension (via env), at least ensure the collection exists so you can see it
        if (EMBEDDING_DIM && EMBEDDING_DIM > 0) {
          try {
            await ensureQdrantCollection(QDRANT_URL, QDRANT_API_KEY, QDRANT_COLLECTION, EMBEDDING_DIM);
            console.log('[qdrant-index] Created/ensured collection using EMBEDDING_DIM fallback');
          } catch (_) {}
        }
        // Mark document for later processing and exit gracefully
        try {
          await supabase
            .from('documents')
            .update({ processing_status: 'pending', processed_at: new Date().toISOString() })
            .eq('id', doc.id);
        } catch (_) {}
        return new Response(
          JSON.stringify({ success: false, error: 'insufficient_quota', message: 'OpenAI quota exceeded; index deferred' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      if (msg.includes('model_not_found') || msg.includes('does not have access to model')) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'model_not_found',
            message:
              'No accessible embedding model. Set EMBEDDING_MODEL to an allowed model (e.g., text-embedding-ada-002).',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      throw e;
    }
    await ensureQdrantCollection(QDRANT_URL, QDRANT_API_KEY, QDRANT_COLLECTION, vectorSize!);
    await ensureQdrantPayloadIndexes(QDRANT_URL, QDRANT_API_KEY, QDRANT_COLLECTION);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (QDRANT_API_KEY) headers['api-key'] = QDRANT_API_KEY;

    // Get existing content hashes for this doc to ensure idempotency (skip duplicates)
    const existingHashes = new Set<string>();
    try {
      const scrollRes = await fetch(`${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points/scroll`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          filter: {
            must: [
              { key: 'user_id', match: { value: doc.user_id } },
              { key: 'doc_id', match: { value: doc.id } },
            ],
          },
          with_payload: true,
          limit: 10000,
        }),
      });
      if (scrollRes.ok) {
        const scrollData = await scrollRes.json();
        const pts = (scrollData?.result?.points ?? []) as Array<{ payload?: any }>; // deno-lint-ignore no-explicit-any
        for (const p of pts) {
          const h = p?.payload?.content_hash;
          if (typeof h === 'string') existingHashes.add(h);
        }
      }
    } catch (_) {
      // continue without idempotency optimization
    }

    let upserted = 0;
    const points: any[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const contentHash = await hashString(`${doc.user_id}|${doc.id}|${chunk}`);
      if (!force && existingHashes.has(contentHash)) continue;
      let vector: number[];
      try {
        vector = await embedText(OPENAI_API_KEY, chunk, selectedModel!);
      } catch (e) {
        const msg = String((e as Error).message || e);
        if (msg.includes('insufficient_quota')) {
          // Stop early; mark requires_processing and return partial
          try {
            await supabase
              .from('documents')
              .update({ processing_status: 'pending', processed_at: new Date().toISOString() })
              .eq('id', doc.id);
          } catch (_) {}
          return new Response(
            JSON.stringify({ success: false, error: 'insufficient_quota', upserted, message: 'OpenAI quota exceeded; index partially completed' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
        if (msg.includes('model_not_found') || msg.includes('does not have access to model')) {
          return new Response(
            JSON.stringify({ success: false, error: 'model_not_found', upserted, message: 'Embedding model not accessible' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
        throw e;
      }
      const pointId = await uuidFromName(`${doc.id}:${i}:${contentHash}`);
      points.push({
        id: pointId,
        vector,
        payload: {
          user_id: doc.user_id,
          conversation_id: null, // later populated when attached to a conversation
          doc_id: doc.id,
          file_name: doc.file_name,
          chunk_id: i,
          text: chunk,
          content_hash: contentHash,
        },
      });
      // Batch in groups to reduce payload size
      if (points.length >= 16 || i === chunks.length - 1) {
        const upRes = await fetch(`${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points?wait=true`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ points }),
        });
        if (!upRes.ok) {
          const errTxt = await upRes.text();
          throw new Error(`Qdrant upsert failed: ${errTxt}`);
        }
        upserted += points.length;
        points.length = 0;
      }
    }

    return new Response(
      JSON.stringify({ success: true, chunks: chunks.length, upserted }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('[qdrant-index] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: corsHeaders },
    );
  }
});

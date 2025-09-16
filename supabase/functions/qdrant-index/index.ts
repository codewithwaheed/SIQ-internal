import 'https://deno.land/x/xhr@0.1.0/mod.ts';
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

type IndexRequest = {
  docId: string;
  conversationId?: string;
  userId?: string;
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

// Generate deterministic UUID from string input
async function uuidFromName(name: string): Promise<string> {
  const data = new TextEncoder().encode(name);
  const digest = await crypto.subtle.digest('SHA-1', data);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Format as UUID v5 (namespace-based)
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    '5' + hex.slice(13, 16), // Version 5
    ((parseInt(hex.slice(16, 17), 16) & 0x3) | 0x8).toString(16) + hex.slice(17, 20), // Variant bits
    hex.slice(20, 32),
  ].join('-');
}

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

async function ensureQdrantCollection(
  baseUrl: string,
  apiKey: string | undefined,
  collection: string,
  vectorSize: number,
) {
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

async function ensureQdrantPayloadIndexes(
  baseUrl: string,
  apiKey: string | undefined,
  collection: string,
) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['api-key'] = apiKey;
  const idxEndpoint = `${baseUrl}/collections/${collection}/points/index`;

  async function getPayloadSchema(): Promise<Record<string, any>> {
    try {
      const r = await fetch(`${baseUrl}/collections/${collection}`);
      if (!r.ok) return {};
      const d = await r.json();
      return d?.result?.payload_schema ?? {};
    } catch {
      return {};
    }
  }

  const existing = await getPayloadSchema();
  const toEnsure = ['user_id', 'conversation_id', 'doc_id'];
  for (const field of toEnsure) {
    if (existing && existing[field]) continue;
    try {
      const body = { field_name: field, field_schema: 'keyword' };
      const res = await fetch(idxEndpoint, { method: 'PUT', headers, body: JSON.stringify(body) });
      if (!res.ok) {
        const t = await res.text();
        if (!/already exists|Index exists/i.test(String(t))) console.warn('[qdrant-index] Index create warn:', t);
      }
      // Poll until index appears (best-effort)
      for (let i = 0; i < 10; i++) {
        const schema = await getPayloadSchema();
        if (schema && schema[field]) break;
        await new Promise((r) => setTimeout(r, 200));
      }
    } catch (e) {
      console.warn('[qdrant-index] Failed to ensure payload index', field, e);
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

// Local deterministic embedding fallback for offline/local dev
function fakeEmbed(text: string, dim: number): number[] {
  const vec = new Array<number>(dim).fill(0);
  // Simple hashed bag-of-characters
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const idx = code % dim;
    vec[idx] += 1;
  }
  // L2 normalize
  let norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
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
    const DISABLE_EMBEDDINGS = (Deno.env.get('DISABLE_EMBEDDINGS') || '').toLowerCase() === '1';
    const DEFAULT_CHUNK_SIZE = parseInt(Deno.env.get('CHUNK_SIZE') ?? '1200', 10);
    const DEFAULT_CHUNK_OVERLAP = parseInt(Deno.env.get('CHUNK_OVERLAP') ?? '200', 10);

    if (!QDRANT_URL || (!OPENAI_API_KEY && !DISABLE_EMBEDDINGS)) {
      return new Response(JSON.stringify({ error: 'Missing QDRANT_URL or OPENAI_API_KEY (unless DISABLE_EMBEDDINGS=1)' }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    const { docId, conversationId, userId, force, chunk_size, chunk_overlap } =
      (await req.json()) as IndexRequest;
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

    // Mark document as processing and reset progress
    try {
      await supabase
        .from('documents')
        .update({ processing_status: 'processing', index_step: 'preparing', index_progress: 0, index_error: null })
        .eq('id', docId);
    } catch (_) {}

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
        text = String(extractResult.extractedText || '')
          .replace(/\s+/g, ' ')
          .trim();
      }
    }
    if (!text || text.length < 10) {
      // Mark failed
      try {
        await supabase
          .from('documents')
          .update({ processing_status: 'failed', index_step: 'extract_text', index_error: 'No extractable text' })
          .eq('id', doc.id);
      } catch (_) {}
      return new Response(JSON.stringify({ error: 'No extractable text in document' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const size = Math.max(200, chunk_size ?? DEFAULT_CHUNK_SIZE);
    const overlap = Math.max(0, Math.min(size - 1, chunk_overlap ?? DEFAULT_CHUNK_OVERLAP));
    const chunks = chunkTextWithOverlap(text, size, overlap);

    // Update step to chunking
    try {
      await supabase
        .from('documents')
        .update({ index_step: 'chunking', index_progress: Math.min(5, Math.round((1 / Math.max(1, chunks.length)) * 100)) })
        .eq('id', doc.id);
    } catch (_) {}

    // Determine embedding vector size by probing once (or using local fallback)
    let vectorSize: number | null = null;
    let selectedModel: string | null = null;
    try {
      if (DISABLE_EMBEDDINGS) {
        vectorSize = EMBEDDING_DIM && EMBEDDING_DIM > 0 ? EMBEDDING_DIM : 256;
        selectedModel = 'local-fake';
        console.log('[qdrant-index] Using local fake embeddings with dim', vectorSize);
      } else {
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
      }
    } catch (e) {
      const msg = String((e as Error).message || e);
      if (msg.includes('insufficient_quota')) {
        // If we know the dimension (via env), at least ensure the collection exists so you can see it
        if (EMBEDDING_DIM && EMBEDDING_DIM > 0) {
          try {
            await ensureQdrantCollection(
              QDRANT_URL,
              QDRANT_API_KEY,
              QDRANT_COLLECTION,
              EMBEDDING_DIM,
            );
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
          JSON.stringify({
            success: false,
            error: 'insufficient_quota',
            message: 'OpenAI quota exceeded; index deferred',
          }),
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
    try {
      await supabase
        .from('documents')
        .update({ index_step: 'embedding', index_progress: 10 })
        .eq('id', doc.id);
    } catch (_) {}

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (QDRANT_API_KEY) headers['api-key'] = QDRANT_API_KEY;

    // Get existing content hashes for this doc to ensure idempotency (skip duplicates)
    const existingHashes = new Set<string>();
    try {
      const scrollRes = await fetch(
        `${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points/scroll`,
        {
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
        },
      );
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
        vector = selectedModel === 'local-fake'
          ? fakeEmbed(chunk, vectorSize!)
          : await embedText(OPENAI_API_KEY, chunk, selectedModel!);
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
            JSON.stringify({
              success: false,
              error: 'insufficient_quota',
              upserted,
              message: 'OpenAI quota exceeded; index partially completed',
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
        if (msg.includes('model_not_found') || msg.includes('does not have access to model')) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'model_not_found',
              upserted,
              message: 'Embedding model not accessible',
            }),
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
          conversation_id: conversationId || null, // Use provided conversationId or null
          doc_id: doc.id,
          file_name: doc.file_name,
          chunk_id: i,
          text: chunk,
          content_hash: contentHash,
        },
      });
      // Batch in groups to reduce payload size
      if (points.length >= 16 || i === chunks.length - 1) {
        const upRes = await fetch(
          `${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points?wait=true`,
          {
            method: 'PUT',
            headers,
            body: JSON.stringify({ points }),
          },
        );
        if (!upRes.ok) {
          const errTxt = await upRes.text();
          throw new Error(`Qdrant upsert failed: ${errTxt}`);
        }
        upserted += points.length;
        points.length = 0;

        // update progress (embedding/indexing combined)
        try {
          const pct = Math.min(99, Math.max(10, Math.round(((i + 1) / chunks.length) * 100)));
          await supabase
            .from('documents')
            .update({ index_step: 'indexing', index_progress: pct })
            .eq('id', doc.id);
        } catch (_) {}
      }
    }

    // Mark completed
    try {
      await supabase
        .from('documents')
        .update({ processing_status: 'completed', index_step: 'ready', index_progress: 100, processed_at: new Date().toISOString() })
        .eq('id', doc.id);
    } catch (_) {}

    return new Response(JSON.stringify({ success: true, chunks: chunks.length, upserted }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[qdrant-index] Error:', error);
    // Try to record error
    try {
      const msg = String((error as Error).message || error);
      // We don't have docId here in the catch scope if earlier throw; best-effort parse from body
      // No-op if not available
    } catch (_) {}
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});

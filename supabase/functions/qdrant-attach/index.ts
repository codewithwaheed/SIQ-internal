import 'https://deno.land/x/xhr@0.1.0/mod.ts';
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

type AttachRequest = {
  conversationId: string;
  docIds: string[];
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const QDRANT_URL = Deno.env.get('QDRANT_URL') ?? '';
    const QDRANT_API_KEY = Deno.env.get('QDRANT_API_KEY') ?? undefined;
    const QDRANT_COLLECTION = Deno.env.get('QDRANT_COLLECTION') ?? 'user_docs';

    if (!QDRANT_URL) {
      return new Response(JSON.stringify({ error: 'QDRANT_URL not configured' }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: userData } = await supabase.auth.getUser(token);
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const { conversationId, docIds } = (await req.json()) as AttachRequest;
    if (!conversationId || !Array.isArray(docIds) || docIds.length === 0) {
      return new Response(JSON.stringify({ error: 'conversationId and docIds are required' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Update payload for all matching points: set conversation_id to this conversation
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (QDRANT_API_KEY) headers['api-key'] = QDRANT_API_KEY;

    const res = await fetch(`${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points/payload`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        filter: {
          must: [
            { key: 'user_id', match: { value: user.id } },
            { key: 'doc_id', match: { any: docIds } },
          ],
        },
        payload: { conversation_id: conversationId },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: `Qdrant payload update failed: ${err}` }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[qdrant-attach] Error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});


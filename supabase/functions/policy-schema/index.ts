import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type RequestBody = {
  message: string;
  frameworks?: string[];
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { message, frameworks } = body || {};
    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'message is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY') ?? '';
    const model = Deno.env.get('OPENAI_API_MODEL') ?? 'gpt-4o-mini';

    const system = `You are a compliance policy assistant. When a user asks to create a policy, you MUST return STRICT JSON with a dynamic form schema and a short guidance text. The JSON must match this TypeScript type exactly:
{
  "policy_type": string,            // machine-friendly slug like "password_management", "acceptable_use"
  "title": string,                  // human-readable policy title
  "guidance_text": string,          // 2 short paragraphs max, plain text, no markdown
  "schema": Array<{
    "key": string,                  // placeholder key e.g. "min_password_length"
    "label": string,                // human label
    "type": "text" | "number" | "boolean" | "select",
    "help"?: string,                 // ≤120 chars concise help
    "options"?: string[],            // for select
    "placeholder"?: string,
    "default"?: string | number | boolean
  }>
}
Only output a JSON object. No explanations, no code fences. Tailor fields to requested frameworks if provided: ${JSON.stringify(frameworks || [])}. Keep the number of fields minimal (5–8).`;

    const payload = {
      model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: message.slice(0, 2000) },
      ],
    };

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const t = await resp.text().catch(() => '');
      return new Response(JSON.stringify({ error: `OpenAI error: ${t}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const json = await resp.json();
    const raw = json?.choices?.[0]?.message?.content;
    let parsed: any = {};
    try {
      parsed = raw ? JSON.parse(raw) : {};
    } catch {
      parsed = {};
    }

    // Minimal validation/sanitization
    const out = {
      policy_type: String(parsed.policy_type || 'generic_template'),
      title: String(parsed.title || 'Policy'),
      guidance_text: String(parsed.guidance_text || 'Please provide details to tailor your policy.'),
      schema: Array.isArray(parsed.schema) ? parsed.schema.slice(0, 12) : [],
    };

    return new Response(JSON.stringify({ success: true, ...out }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[policy-schema] error', e);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});


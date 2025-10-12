import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY') ?? '';
    const model = Deno.env.get('OPENAI_API_MODEL') ?? 'gpt-4o-mini';
    if (!apiKey) return new Response(JSON.stringify({ error: 'Missing OPENAI_API_KEY' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const body = await req.json().catch(() => ({}));
    const message: string = String(body?.message || '');
    if (!message) return new Response(JSON.stringify({ error: 'message is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const system = `Classify if the user is asking to CREATE a policy (not just Q&A). Return STRICT JSON only with fields:
{
  "is_policy": boolean,
  "policy_type": string | null, // lowercase slug if obvious (e.g., password_management, acceptable_use, incident_response, access_control, information_security), else null
  "title": string | null,       // human title like "Access Control Policy" if obvious
  "confidence": number          // 0..1
}
Interpret examples like "generate me Information Security policy using SOC2" as creation with title "Information Security Policy" and policy_type "information_security".`;

    const payload = {
      model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: message.slice(0, 1200) },
      ],
    };

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const t = await resp.text().catch(() => '');
      return new Response(JSON.stringify({ error: `OpenAI error: ${t}` }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const json = await resp.json();
    const raw = json?.choices?.[0]?.message?.content;
    let parsed: any = {};
    try { parsed = raw ? JSON.parse(raw) : {}; } catch { parsed = {}; }
    const out = {
      is_policy: !!parsed.is_policy,
      policy_type: typeof parsed.policy_type === 'string' ? String(parsed.policy_type) : null,
      title: typeof parsed.title === 'string' ? String(parsed.title) : null,
      confidence: typeof parsed.confidence === 'number' ? Number(parsed.confidence) : 0.5,
    };
    return new Response(JSON.stringify(out), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});


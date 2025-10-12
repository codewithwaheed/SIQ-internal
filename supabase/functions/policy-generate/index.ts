import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type RequestBody = {
  message?: string;
  policy_type: string;
  title?: string;
  frameworks?: string[];
  answers: Record<string, string>;
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

    const { policy_type, title, frameworks, answers, message } = body || ({} as RequestBody);
    if (!policy_type || !answers || typeof answers !== 'object') {
      return new Response(JSON.stringify({ error: 'policy_type and answers are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY') ?? '';
    const model = Deno.env.get('OPENAI_API_MODEL') ?? 'gpt-4o-mini';

    const schemaNote = Object.entries(answers)
      .map(([k, v]) => `- ${k}: ${String(v)}`)
      .join('\n');

    const sys = `You are a cybersecurity policy generator. Produce a complete, practical, and concise policy in Markdown for the requested type. Use standard sections and keep language clear. Align where appropriate with frameworks: ${(frameworks || []).join(', ') || 'none specified'}.
Sections to include (H2 headings):
## Introduction
## Purpose
## Scope
## Definitions (brief)
## Policy Statement
## Procedures
## Responsibilities
## Consequences of Non-Compliance
## References
## Revision History

Rules:
- Use the provided field values.
- Avoid placeholders like {{token}}.
- Keep to 1–2 paragraphs per section when reasonable.
- Return only Markdown, no code fences.`;

    const userContent = `Draft a ${policy_type} policy titled: ${title || 'Policy'}.
User context (from form):\n${schemaNote}\n\nUser request: ${message || ''}`.slice(0, 6000);

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: userContent },
        ],
      }),
    });

    if (!resp.ok) {
      const t = await resp.text().catch(() => '');
      return new Response(JSON.stringify({ error: `OpenAI error: ${t}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const data = await resp.json();
    const md = String(data?.choices?.[0]?.message?.content || '').trim();

    // Basic stabilization: ensure trailing newline
    const policy_markdown = md.endsWith('\n') ? md : md + '\n';

    return new Response(JSON.stringify({ success: true, policy_markdown }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[policy-generate] error', e);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

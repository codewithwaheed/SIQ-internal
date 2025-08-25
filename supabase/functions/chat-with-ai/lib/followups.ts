// deno-lint-ignore-file no-explicit-any
/**
 * One quick non-stream call to produce server-driven suggestions/next steps for the UI.
 * Returns a lean, safe object. Failures are swallowed (return {}).
 */

export type Followups = {
  suggestions?: string[];
  next_actions?: string[];
  framework_tags?: string[];
  risk_level?: 'low' | 'medium' | 'high';
};

export async function generateFollowups(
  apiKey: string,
  model: string,
  userText: string,
  assistantText: string,
): Promise<Followups> {
  try {
    const messages = [
      {
        role: 'system',
        content:
          'You are a helpful assistant that outputs STRICT JSON for UI follow-up chips and task hints. Be concise and specific.',
      },
      {
        role: 'user',
        content:
          `User message:\n${userText}\n\nAssistant reply:\n${assistantText}\n\n` +
          `Return a single JSON object with exact fields:
{
  "suggestions": string[]  // up to 4 short follow-up prompts a user might tap next,
  "next_actions": string[] // up to 5 concrete next steps (imperative verbs, brief),
  "framework_tags": string[] // optional standards like "SOC 2", "NIST CSF",
  "risk_level": "low" | "medium" | "high" // optional coarse risk call if relevant
}
No markdown, no code fences, only valid JSON.`,
      },
    ];

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages,
      }),
    });

    const json = await resp.json();
    const raw = json?.choices?.[0]?.message?.content;
    if (!raw) return {};
    const parsed = JSON.parse(raw);

    const out: any = {};
    if (Array.isArray(parsed.suggestions)) out.suggestions = parsed.suggestions.slice(0, 4);
    if (Array.isArray(parsed.next_actions)) out.next_actions = parsed.next_actions.slice(0, 5);
    if (Array.isArray(parsed.framework_tags))
      out.framework_tags = parsed.framework_tags.slice(0, 6);
    if (typeof parsed.risk_level === 'string') {
      const rl = String(parsed.risk_level).toLowerCase();
      if (rl === 'low' || rl === 'medium' || rl === 'high') out.risk_level = rl;
    }
    return out as Followups;
  } catch {
    return {};
  }
}

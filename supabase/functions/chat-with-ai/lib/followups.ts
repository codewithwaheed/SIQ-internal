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

function deriveHeuristics(userText: string, assistantText: string): Followups {
  const text = `${userText}\n${assistantText}`.toLowerCase();

  // Framework keyword heuristic
  const frameworkCatalog = [
    'soc 2',
    'iso 27001',
    'nist 800-171',
    'nist 800 171',
    'nist csf',
    'hipaa',
    'gdpr',
    'pci dss',
    'fedramp',
    'cmmc',
  ];
  const foundTags = Array.from(
    new Set(
      frameworkCatalog
        .filter((fw) => text.includes(fw))
        .map((fw) =>
          fw
            .replace(/\s+/g, ' ')
            .trim()
            .replace('soc 2', 'SOC 2')
            .replace('iso 27001', 'ISO 27001')
            .replace('nist 800-171', 'NIST 800-171')
            .replace('nist 800 171', 'NIST 800-171')
            .replace('nist csf', 'NIST CSF')
            .replace('hipaa', 'HIPAA')
            .replace('gdpr', 'GDPR')
            .replace('pci dss', 'PCI DSS')
            .replace('fedramp', 'FedRAMP')
            .replace('cmmc', 'CMMC'),
        ),
    ),
  );

  // Risk heuristic
  let risk: 'low' | 'medium' | 'high' = 'low';
  const highSignals = [
    'ransomware',
    'breach',
    'compromise',
    'data leak',
    'critical',
    'urgent',
    'exfiltration',
    'high risk',
    'immediate action',
  ];
  const medSignals = [
    'vulnerability',
    'phishing',
    'exposure',
    'misconfiguration',
    'weakness',
    'concern',
  ];
  if (highSignals.some((w) => text.includes(w))) risk = 'high';
  else if (medSignals.some((w) => text.includes(w))) risk = 'medium';

  // Next actions heuristic (generic, safe)
  const nextActions = [
    'Assess current controls and gaps',
    'Document required policies and procedures',
    'Implement missing technical controls',
    'Train staff on responsibilities',
    'Schedule an internal review/audit',
  ];

  // Suggestions chips heuristic
  const suggestions = [
    'List our current controls',
    'Which controls are missing?',
    'Provide a remediation checklist',
    'Map this to frameworks',
  ];

  const out: Followups = {
    framework_tags: foundTags.slice(0, 6),
    risk_level: risk,
    next_actions: nextActions,
    suggestions,
  };
  return out;
}

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
        response_format: { type: 'json_object' },
        messages,
      }),
    });

    const json = await resp.json();
    const raw = json?.choices?.[0]?.message?.content;
    const parsed = raw ? JSON.parse(raw) : {};

    const out = deriveHeuristics(userText, assistantText);
    if (Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0)
      out.suggestions = parsed.suggestions.slice(0, 4);
    if (Array.isArray(parsed.next_actions) && parsed.next_actions.length > 0)
      out.next_actions = parsed.next_actions.slice(0, 5);
    if (Array.isArray(parsed.framework_tags) && parsed.framework_tags.length > 0)
      out.framework_tags = parsed.framework_tags.slice(0, 6);
    if (typeof parsed.risk_level === 'string') {
      const rl = String(parsed.risk_level).toLowerCase();
      if (rl === 'low' || rl === 'medium' || rl === 'high') out.risk_level = rl;
    }
    return out as Followups;
  } catch {
    return deriveHeuristics(userText, assistantText);
  }
}

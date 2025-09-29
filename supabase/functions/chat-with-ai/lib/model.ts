// lib/model.ts (Deno)
export function selectModel(): string {
  return Deno.env.get('OPENAI_API_MODEL') ?? 'gpt-4o-mini';
}

async function callChatCompletions(
  apiKey: string,
  model: string,
  userText: string,
  instructions?: string,
): Promise<Response> {
  console.log('[MODEL] Using Chat Completions with model:', model);

  const body = {
    model,
    messages: [
      ...(instructions ? [{ role: 'system', content: instructions }] : []),
      { role: 'user', content: userText },
    ],
    stream: true,
    max_completion_tokens: 1000,
  };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`, // full key
      'Content-Type': 'application/json',
      ...(Deno.env.get('OPENAI_ORG') ? { 'OpenAI-Organization': Deno.env.get('OPENAI_ORG')! } : {}),
      ...(Deno.env.get('OPENAI_PROJECT')
        ? { 'OpenAI-Project': Deno.env.get('OPENAI_PROJECT')! }
        : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000),
  });

  console.log('[MODEL] Chat Completions status:', res.status);
  if (!res.ok) {
    console.log('[MODEL] Chat Completions body:', await res.text());
  }
  return res;
}

export async function callModelStream(
  apiKey: string,
  model: string,
  openAIConversationId: string | null,
  userText: string,
  instructions?: string,
  imageUrls?: string[],
): Promise<Response> {
  console.log('[MODEL] Attempting Responses API call with model:', model);

  const requestBody: Record<string, any> = {
    model,
    input: [
      ...(instructions
        ? [
            {
              role: 'system',
              content: [{ type: 'input_text', text: instructions }],
            },
          ]
        : []),
      {
        role: 'user',
        content: [
          { type: 'input_text', text: userText },
          ...((imageUrls || []).map((u) => ({ type: 'input_image', image_url: u }))),
        ],
      },
    ],
    ...(openAIConversationId ? { conversation: openAIConversationId } : {}),
    text: { format: { type: 'text' } },
    // response_format: { type: 'text' },
    // reasoning: { effort: 'none', max_tokens: 0 },
    // temperature: 0.7,
    stream: true,
    max_output_tokens: 5000,
    ...(instructions ? { instructions } : {}),
  };

  console.log('[MODEL] Responses API request body:', JSON.stringify(requestBody, null, 2));

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`, // DO NOT truncate
      'Content-Type': 'application/json',
    };
    // optional scoping headers
    if (Deno.env.get('OPENAI_ORG')) headers['OpenAI-Organization'] = Deno.env.get('OPENAI_ORG')!;
    if (Deno.env.get('OPENAI_PROJECT')) headers['OpenAI-Project'] = Deno.env.get('OPENAI_PROJECT')!;

    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(120000),
    });

    console.log('[MODEL] Responses API status:', res.status);
    console.log(
      '[MODEL] Responses API headers:',
      JSON.stringify(Object.fromEntries(res.headers.entries())),
    );

    if (res.ok) {
      return res;
    } else {
      const errText = await res.text();
      console.log('[MODEL] Responses API error body:', errText);
      throw new Error(`Responses API failed: ${res.status} - ${errText}`);
    }
  } catch (err) {
    console.log('[MODEL] Error calling Responses API, falling back to Chat Completions');
    console.log('[MODEL] Error details:', err);
    // Fallback: if images provided, include URLs inline as text for minimal context
    const fallbackText = (imageUrls && imageUrls.length)
      ? `${userText}\n\nAttached images (temporary URLs):\n${imageUrls.join('\n')}`
      : userText;
    return callChatCompletions(apiKey, model, fallbackText, instructions);
  }
}

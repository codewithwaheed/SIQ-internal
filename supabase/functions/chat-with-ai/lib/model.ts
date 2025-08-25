export function selectModel(): string {
  return 'gpt-4o-mini'; // adjust if needed
}

export function callOpenAIStream(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
): Promise<Response> {
  return fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      top_p: 0.9,
      stream: true,
      max_tokens: 1000,
    }),
    signal: AbortSignal.timeout(120000),
  });
}

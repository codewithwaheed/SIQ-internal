export function selectModel(): string {
  return Deno.env.get("OPENAI_API_MODEL") ?? "gpt-4o-mini"; // adjust if needed
}

// Prefer the Responses API with Conversations; fallback to Chat Completions if unavailable.
export async function callModelStream(
  apiKey: string,
  model: string,
  openAIConversationId: string | null,
  userText: string,
  instructions?: string,
): Promise<Response> {
  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        // The conversation id links state so we don't need to resend history
        conversation: openAIConversationId ?? null,
        // Provide the fresh user turn as input
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: userText },
            ],
          },
        ],
        // Carry our system prompt as instructions
        ...(instructions ? { instructions } : {}),
        stream: true,
        temperature: 0.3,
        top_p: 0.9,
        max_output_tokens: 1000,
      }),
      signal: AbortSignal.timeout(120000),
    });
    if (res.ok) return res;
  } catch (_) {
    // fall through
  }

  // Fallback: Chat Completions
  return fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        ...(instructions ? [{ role: "system", content: instructions }] : []),
        { role: "user", content: userText },
      ],
      temperature: 0.3,
      top_p: 0.9,
      stream: true,
      max_completion_tokens: 1000,
    }),
    signal: AbortSignal.timeout(120000),
  });
}

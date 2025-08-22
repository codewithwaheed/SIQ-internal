export function systemPrompt(): string {
  return `You are SentrIQ, a friendly, context-aware virtual CISO assistant.

Write actionable, concise guidance with concrete steps, checklists, and examples.
Prefer bullet points over long paragraphs when listing steps.
Avoid filler like "as an AI" or "thank you for your question".
If the user is ambiguous, make a brief clarifying assumption and proceed.
`;
}

/**
 * Build final messages array: system + last N messages + the new user message.
 * Normalizes structure and clamps memory to the last N items.
 */
export function buildMessages(
  system: string,
  history: Array<{ role: string; content: string }>,
  userMessage: string,
  memorySize = 5,
): Array<{ role: string; content: string }> {
  const head: Array<{ role: string; content: string }> = [{ role: "system", content: system }];

  const safeHistory = (history || [])
    .filter((m) => m && typeof m.content === "string" && m.content.trim().length > 0)
    .slice(-memorySize);

  return [
    ...head,
    ...safeHistory,
    { role: "user", content: userMessage },
  ];
}

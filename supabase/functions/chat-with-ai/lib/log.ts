export const logStep = (step: string, details?: any) =>
  console.log(`[CHAT-WITH-AI] ${step}${details ? " - " + JSON.stringify(details) : ""}`);

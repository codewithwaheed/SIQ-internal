export function deriveTitleFromFirstMessage(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").replace(/^please\s+/i, "").trim();

  const firstBreak = cleaned.search(/[.?!\n]/);
  let candidate = firstBreak > 0 ? cleaned.slice(0, firstBreak) : cleaned;

  candidate = candidate.replace(/^(help|need|please|can you|could you|i need)\s+/i, "").trim();

  candidate = candidate.replace(/[.?!\s]+$/g, "").trim();
  if (candidate.length > 60) candidate = candidate.slice(0, 57).trim() + "…";

  const small = new Set(["a","an","and","or","for","the","to","of","in","on","at","by","with"]);
  const words = candidate.split(" ");
  const titled = words
    .map((w, i) => {
      const lower = w.toLowerCase();
      if (i > 0 && small.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
  return titled || "New Conversation";
}

export async function fetchDocSnippets(
  supabaseAdmin: any,
  userId: string,
  activeDocuments: string[] | undefined,
  query: string
): Promise<string[]> {
  if (!activeDocuments?.length) return [];
  try {
    const { data, error } = await supabaseAdmin.functions.invoke("query-vectors", {
      body: { query, userId, activeDocuments, limit: 3 },
    });
    if (error) return [];
    const snippets: string[] = data?.snippets || [];
    return snippets.slice(0, 3).map((s) => (s.length > 600 ? s.slice(0, 600) + "…" : s));
  } catch {
    return [];
  }
}

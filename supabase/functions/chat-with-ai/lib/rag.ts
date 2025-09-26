export type RetrievedChunk = {
  text: string;
  score: number;
  doc_id: string;
  file_name: string;
  chunk_id: number;
  conversation_id: string | null;
};

export async function retrieveContext(
  supabaseAdmin: any,
  params: {
    userId: string;
    conversationId?: string | null;
    activeDocuments?: string[];
    query: string;
    topK?: number;
    mode?: 'vector' | 'doc_scroll';
  },
): Promise<RetrievedChunk[]> {
  const { userId, conversationId, activeDocuments, query, topK = 5, mode } = params;
  try {
    const { data, error } = await supabaseAdmin.functions.invoke('query-vectors', {
      body: { query, userId, conversationId, activeDocuments, topK, mode },
    });
    if (error) return [];
    const chunks: RetrievedChunk[] = data?.relevant_chunks || [];
    return chunks.slice(0, topK).map((c) => ({
      ...c,
      text: c.text.length > 800 ? c.text.slice(0, 800) + '…' : c.text,
    }));
  } catch (e) {
    console.warn('retrieveContext failed:', e);
    return [];
  }
}

import { corsHeaders } from "./util.ts";

export function sseHeaders(): Record<string, string> {
  return {
    ...corsHeaders,
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  };
}

/** Replays a cached string as SSE: chunk by chunk (space-split), then complete + [DONE]. */
export function streamCachedReplay(cached: string, conversationId: string, title: string): Response {
  const encoder = new TextEncoder();
  const words = cached.split(" ");

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let i = 0;
      const tick = () => {
        if (i < words.length) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "chunk", content: words[i] + (i < words.length - 1 ? " " : "") })}\n\n`,
            ),
          );
          i++;
          setTimeout(tick, 15);
        } else {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "complete", conversation_id: conversationId, title })}\n\n`,
            ),
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      };
      tick();
    },
  });

  return new Response(stream, { headers: sseHeaders() });
}

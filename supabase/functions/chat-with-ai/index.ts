import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { LRUCache } from "./lib/cache.ts";
import { hashString } from "./lib/hash.ts";
import { logStep } from "./lib/log.ts";
import { selectModel, callOpenAIStream } from "./lib/model.ts";
import { deriveTitleFromFirstMessage } from "./lib/title.ts";
import { systemPrompt, buildMessages } from "./lib/memory.ts";
import { sseHeaders, streamCachedReplay } from "./lib/sse.ts";
import type { ChatMessageRow } from "./lib/types.ts";
import {
  corsHeaders,
  getClientsAndUser,
  getClientIp,
  createErrorResponse,
  HTTP_STATUS,
  ERROR_CODES,
  inMemoryRateLimit,
} from "./lib/util.ts";

const responseCache = new LRUCache();

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing required env vars");
      return createErrorResponse(
        "Server misconfiguration",
        HTTP_STATUS.INTERNAL_ERROR,
        ERROR_CODES.INTERNAL_ERROR,
      );
    }

    // Parse body
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return createErrorResponse("Invalid JSON body", HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_INPUT);
    }

    const {
      content,
      message,
      conversationId,
      title,
      activeDocuments, // reserved for future RAG
      isDemo,
      conversation,    // demo history: [{role, content}]
    } = body;

    // Validate/sanitize input
    const userMessage: string | undefined = typeof content === "string" ? content : message;
    if (!userMessage || typeof userMessage !== "string") {
      return createErrorResponse("Message content is required and must be a string", HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_INPUT);
    }
    if (userMessage.length > 10000) {
      return createErrorResponse("Message too long (max 10000 characters)", HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_INPUT);
    }

    // Very light sanitizer; keep your own if you wish
    const sanitizedMessage = userMessage.replace(/\u0000/g, "").trim();
    if (!sanitizedMessage) {
      return createErrorResponse("Message cannot be empty", HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_INPUT);
    }

    // Auth & clients (uses incoming Authorization on anon client)
    const { supabaseAuth, supabaseAdmin, user, userRole, orgId, isAuthenticated } =
      await getClientsAndUser(req);

    if (!isDemo && !isAuthenticated) {
      return new Response(
        JSON.stringify({ error: "Authentication required for non-demo requests", status: 401, code: "UNAUTHORIZED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Rate limit by IP (in-memory best-effort; replace with DB limit if needed)
    if (!isDemo) {
      const ip = getClientIp(req) || "127.0.0.1";
      const allowed = inMemoryRateLimit(ip, 60, 60_000); // 60 req / minute
      if (!allowed) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded", code: ERROR_CODES.RATE_LIMITED }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Conversation bootstrap + memory (last 5 historical messages)
    let conversationData: any;
    let messageHistory: Array<{ role: string; content: string }> = [];
    let finalTitle: string | null = null;

    if (isDemo) {
      // demo mode: accept provided short history
      messageHistory = Array.isArray(conversation) ? conversation.slice(-5) : [];
      conversationData = { id: "demo" };
      finalTitle = "Demo Conversation";
    } else if (conversationId && user) {
      // fetch conversation & verify ownership
      const { data: existingConv, error: convError } = await supabaseAdmin
        .from("chat_conversations")
        .select("*")
        .eq("id", conversationId)
        .eq("user_id", user.id)
        .single();

      if (convError || !existingConv) {
        return createErrorResponse("Conversation not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
      }
      conversationData = existingConv;
      finalTitle = conversationData.title;

      // fetch history; keep last 5 and normalize consultant->assistant for UI semantics
      const { data: rows } = await supabaseAdmin
        .from("chat_messages")
        .select("role, content")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (Array.isArray(rows)) {
        const normalized = (rows as ChatMessageRow[]).map((r) => ({
          role: r.role === "consultant" ? "assistant" : r.role,
          content: r.content ?? "",
        }));
        messageHistory = normalized.slice(-5);
      }
    } else if (!isDemo && user) {
      // new conversation ➜ derive and persist title
      finalTitle = (title && title.trim()) || deriveTitleFromFirstMessage(sanitizedMessage);
      const { data: newConv, error: createError } = await supabaseAdmin
        .from("chat_conversations")
        .insert({ user_id: user.id, org_id: orgId, title: finalTitle, tags: [] })
        .select()
        .single();
      if (createError || !newConv) {
        console.error("Create conversation failed", createError);
        return createErrorResponse("Failed to create conversation", HTTP_STATUS.INTERNAL_ERROR, ERROR_CODES.DATABASE_ERROR);
      }
      conversationData = newConv;
    } else {
      // demo fallback
      conversationData = { id: "demo" };
      finalTitle = "Demo Conversation";
    }

    // Persist user message (non-demo)
    if (!isDemo && user) {
      await supabaseAdmin.from("chat_messages").insert({
        conversation_id: conversationData.id,
        role: "user",
        content: sanitizedMessage,
        metadata: { original_length: userMessage.length, sanitized: true },
      });
      await supabaseAdmin
        .from("chat_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationData.id);
    }

    // Build LLM prompt
    const model = selectModel();
    const messagesForLLM = buildMessages(systemPrompt(), messageHistory, sanitizedMessage, 5);

    // Cache
    const cacheKey = await hashString(JSON.stringify({ model, messagesForLLM }));
    const cached = responseCache.get(cacheKey);
    if (cached) {
      logStep("Cache hit");
      return streamCachedReplay(String(cached), conversationData.id, finalTitle!);
    }

    // Call OpenAI (stream)
    logStep("Calling OpenAI", { model });
    const oaRes = await callOpenAIStream(OPENAI_API_KEY, model, messagesForLLM);
    if (!oaRes.ok) {
      const errText = await oaRes.text();
      return new Response(JSON.stringify({
        error: `OpenAI API error (${oaRes.status}): ${errText}`,
        status: oaRes.status,
        retry_recommended: oaRes.status >= 500 || oaRes.status === 429,
      }), { status: oaRes.status >= 500 ? 500 : 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Proxy SSE to FE while aggregating full content
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullContent = "";

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          const reader = oaRes.body?.getReader();
          if (!reader) throw new Error("No reader from OpenAI");

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value);
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const payload = line.slice(6).trim();
              if (payload === "[DONE]") continue;

              try {
                const parsed = JSON.parse(payload);
                const piece: string | undefined = parsed?.choices?.[0]?.delta?.content;
                if (piece) {
                  fullContent += piece;
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: "chunk", content: piece })}\n\n`)
                  );
                }
              } catch {
                // ignore heartbeats/non-JSON
              }
            }
          }

          // Save assistant message & cache if any content
          if (fullContent.trim()) {
            responseCache.set(cacheKey, fullContent);

            if (!isDemo && user) {
              await supabaseAdmin.from("chat_messages").insert({
                conversation_id: conversationData.id,
                role: "assistant",
                content: fullContent,
                metadata: { model, tokens: fullContent.length },
              });
              await supabaseAdmin
                .from("chat_conversations")
                .update({ updated_at: new Date().toISOString() })
                .eq("id", conversationData.id);
            }
          }

          // Final markers for FE
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "complete", conversation_id: conversationData.id, title: finalTitle })}\n\n`
            )
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (e) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: (e as Error).message })}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(stream, { headers: sseHeaders() });
  } catch (error) {
    console.error("Error in chat-with-ai:", error);
    return createErrorResponse(
      "AI chat service temporarily unavailable",
      HTTP_STATUS.INTERNAL_ERROR,
      ERROR_CODES.INTERNAL_ERROR,
    );
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createErrorResponse,
  ERROR_CODES,
  HTTP_STATUS,
} from "../_shared/error-handler.ts";
import { InputSanitizer, securityHeaders } from "../_shared/security-utils.ts";
import { checkRateLimit } from "../_shared/auth-middleware.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Cache-Control": "no-cache, no-transform",
  "X-Accel-Buffering": "no",
  ...securityHeaders,
};

// ---------- Helpers ----------
class LRUCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private maxSize = 100;
  private ttl = 5 * 60 * 1000;
  set(key: string, value: any) {
    const now = Date.now();
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, { data: value, timestamp: now });
  }
  get(key: string) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.data;
  }
}
const responseCache = new LRUCache();

async function hashString(str: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

const logStep = (step: string, details?: any) =>
  console.log(`[CHAT-WITH-AI] ${step}${details ? " - " + JSON.stringify(details) : ""}`);

function selectModel() {
  return "gpt-4o-mini";
}

// Title generator: fast, deterministic, no extra API call
function deriveTitleFromFirstMessage(text: string): string {
  const cleaned = text
    .replace(/\s+/g, " ")
    .replace(/^please\s+/i, "")
    .trim();

  // take first sentence-ish
  const firstBreak = cleaned.search(/[.?!\n]/);
  let candidate = firstBreak > 0 ? cleaned.slice(0, firstBreak) : cleaned;

  // strip leading verbs like "help/need/please"
  candidate = candidate.replace(/^(help|need|please|can you|could you|i need)\s+/i, "").trim();

  // remove trailing punctuation and truncate
  candidate = candidate.replace(/[.?!\s]+$/g, "").trim();
  if (candidate.length > 60) candidate = candidate.slice(0, 57).trim() + "…";

  // Title case lite (keep small words lowercase unless first)
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

// ---------- Handler ----------
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    const body = await req.json();
    const {
      content,
      message,
      conversationId,
      title,
      activeDocuments,
      isDemo,
      conversation,
    } = body;

    const userMessage: string | undefined = typeof content === "string" ? content : message;
    if (!userMessage || typeof userMessage !== "string") {
      return createErrorResponse("Message content is required and must be a string", HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_INPUT);
    }
    if (userMessage.length > 10000) {
      return createErrorResponse("Message too long (max 10000 characters)", HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_INPUT);
    }

    const sanitizedMessage = InputSanitizer.sanitizeChatMessage(userMessage);

    // Auth pattern: forward Authorization into anon client
    const incomingAuth =
      req.headers.get("Authorization") ??
      req.headers.get("authorization") ??
      "";

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: incomingAuth } },
      auth: { persistSession: false },
    });
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    let user: any = null;
    let userRole = "business_owner";
    let orgId: string | null = null;

    if (!isDemo) {
      const { data, error } = await supabaseAuth.auth.getUser();
      if (error || !data.user) {
        return new Response(
          JSON.stringify({ error: "Authentication required for non-demo requests", status: 401, code: "UNAUTHORIZED" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      user = data.user;

      const { data: roleRow } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      if (roleRow?.role) userRole = roleRow.role;

      const { data: orgRow } = await supabaseAdmin
        .from("organization_memberships")
        .select("org_id")
        .eq("user_id", user.id)
        .single();
      orgId = orgRow?.org_id ?? null;

      // Get client IP address for rate limiting
      const clientIP = 
        req.headers.get("x-forwarded-for")?.split(",")[0] ||
        req.headers.get("x-real-ip") ||
        req.headers.get("cf-connecting-ip") ||
        "127.0.0.1"; // fallback for local development

      const rateLimit = await checkRateLimit(supabaseAdmin, clientIP, userRole, "chat-with-ai");
      if (!rateLimit.allowed) {
        return new Response(JSON.stringify({
          error: "Rate limit exceeded",
          details: { remainingRequests: rateLimit.remainingRequests, resetTime: rateLimit.resetTime.toISOString() },
        }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Conversation + title handling
    let conversationData: any;
    let messageHistory: Array<{ role: string; content: string }> = [];
    let finalTitle: string | null = null;

    if (isDemo) {
      messageHistory = conversation || [];
      conversationData = { id: "demo" };
    } else if (conversationId && user) {
      const { data: existingConv, error: convError } = await supabaseAdmin
        .from("chat_conversations")
        .select("*")
        .eq("id", conversationId)
        .eq("user_id", user.id)
        .single();
      if (convError) throw new Error(`Failed to retrieve conversation: ${convError.message}`);
      conversationData = existingConv;

      const { data: messages } = await supabaseAdmin
        .from("chat_messages")
        .select("role, content, metadata")
        .eq("conversation_id", conversationId)
        .order("created_at");
      if (messages) messageHistory = messages;
      finalTitle = conversationData.title;
    } else if (!isDemo && user) {
      // NEW conversation ➜ derive title from first message
      finalTitle = title?.trim() || deriveTitleFromFirstMessage(sanitizedMessage);
      const { data: newConv, error: createError } = await supabaseAdmin
        .from("chat_conversations")
        .insert({ user_id: user.id, org_id: orgId, title: finalTitle, tags: [] })
        .select()
        .single();
      if (createError) throw new Error(`Failed to create conversation: ${createError.message}`);
      conversationData = newConv;
    } else {
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
      // refresh updated_at
      await supabaseAdmin
        .from("chat_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationData.id);
    }

    const systemPrompt =
      `You are SentrIQ, a friendly, context-aware virtual CISO assistant designed to help businesses with comprehensive cybersecurity guidance.
Be concrete, concise, and actionable.`;

    const conversationMessages = [
      { role: "system", content: systemPrompt },
      ...messageHistory.slice(-8),
      { role: "user", content: sanitizedMessage },
    ];

    const selectedModel = selectModel();

    // Cache
    const cacheKey = await hashString(JSON.stringify(conversationMessages));
    const cached = responseCache.get(cacheKey);
    if (cached) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          const words = (cached as string).split(" ");
          let i = 0;
          const pump = () => {
            if (i < words.length) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "chunk", content: words[i] + (i < words.length - 1 ? " " : "") })}\n\n`));
              i++;
              setTimeout(pump, 20);
            } else {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "complete", conversation_id: conversationData.id, title: finalTitle })}\n\n`));
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
            }
          };
          pump();
        },
      });
      return new Response(stream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream; charset=utf-8", Connection: "keep-alive" },
      });
    }

    // OpenAI stream
    const oaRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: selectedModel,
        messages: conversationMessages,
        temperature: 0.3,
        top_p: 0.9,
        stream: true,
        max_tokens: 1000,
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!oaRes.ok) {
      const errorText = await oaRes.text();
      return new Response(JSON.stringify({
        error: `OpenAI API error (${oaRes.status}): ${errorText}`,
        status: oaRes.status,
        retry_recommended: oaRes.status >= 500 || oaRes.status === 429,
      }), { status: oaRes.status >= 500 ? 500 : 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const encoder = new TextEncoder();
    let fullContent = "";
    let buffer = "";
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const reader = oaRes.body?.getReader();
          if (!reader) throw new Error("No reader available");

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
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullContent += content;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "chunk", content })}\n\n`));
                }
              } catch { /* ignore non-JSON heartbeats */ }
            }
          }

          if (fullContent.trim()) {
            responseCache.set(cacheKey, fullContent);
            if (!isDemo && user) {
              await supabaseAdmin.from("chat_messages").insert({
                conversation_id: conversationData.id,
                role: "assistant",
                content: fullContent,
                metadata: { model: selectedModel, tokens: fullContent.length },
              });
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: "complete",
            conversation_id: conversationData.id,
            title: finalTitle,
          })}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (e) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: (e as Error).message })}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream; charset=utf-8", Connection: "keep-alive" },
    });
  } catch (error) {
    console.error("Error in chat-with-ai:", error);
    return createErrorResponse("AI chat service temporarily unavailable", HTTP_STATUS.INTERNAL_ERROR, ERROR_CODES.INTERNAL_ERROR);
  }
});

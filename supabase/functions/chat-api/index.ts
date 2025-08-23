import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  sanitizeResponse,
  SecurityContext,
  withSecurity,
} from "../_shared/security-hardening.ts";
import {
  createErrorResponse,
  ERROR_CODES,
  HTTP_STATUS,
} from "../_shared/error-handler.ts";
import { InputSanitizer } from "../_shared/security-utils.ts";
import { corsHeaders } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

interface ChatMessage {
  id: string;
  conversation_id: string;
  content: string;
  role: "user" | "assistant" | "consultant" | "system";
  timestamp: string;
  metadata?: Record<string, any>;
}

interface Conversation {
  id: string;
  user_id: string;
  title: string;
  status: "active" | "escalated" | "resolved" | "archived";
  escalation_id?: string;
  last_message_at?: string;
  created_at: string;
  updated_at: string;
  org_id: string;
  tags?: string[];
}

// local helper for titles (same rules as chat-with-ai)
function deriveTitle(text: string): string {
  const cleaned = (text || "")
    .replace(/\s+/g, " ")
    .replace(/^please\s+/i, "")
    .trim();
  const firstBreak = cleaned.search(/[.?!\n]/);
  let candidate = firstBreak > 0 ? cleaned.slice(0, firstBreak) : cleaned;
  candidate = candidate.replace(/^(help|need|please|can you|could you|i need)\s+/i, "").trim();
  candidate = candidate.replace(/[.?!\s]+$/g, "").trim();
  if (candidate.length > 60) candidate = candidate.slice(0, 57).trim() + "…";
  if (!candidate) return "New Conversation";
  const small = new Set(["a","an","and","or","for","the","to","of","in","on","at","by","with"]);
  const words = candidate.split(" ");
  const titled = words.map((w, i) => {
    const lower = w.toLowerCase();
    if (i > 0 && small.has(lower)) return lower;
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join(" ");
  return titled;
}

Deno.serve(async (req) => {
  return withSecurity(
    req,
    {
      requireAuth: true,
      rateLimitKey: "chat-api",
      logActivity: true,
    },
    async (request: Request, context: SecurityContext) => {
      const url = new URL(request.url);
      const pathSegments = url.pathname.split("/").filter(Boolean);
      const chatApiIndex = pathSegments.indexOf("chat-api");
      const relevantSegments = chatApiIndex >= 0
        ? pathSegments.slice(chatApiIndex + 1)
        : pathSegments;

      if (relevantSegments.length === 1 && relevantSegments[0] === "conversations") {
        return await handleConversations(request, context);
      } else if (
        relevantSegments.length === 3 &&
        relevantSegments[0] === "conversations" &&
        relevantSegments[2] === "messages"
      ) {
        const conversationId = relevantSegments[1];
        return await handleMessages(request, conversationId, context);
      } else {
        return createErrorResponse("Invalid endpoint", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
      }
    },
  );
});

async function handleConversations(req: Request, context: SecurityContext) {
  switch (req.method) {
    case "GET":
      return await listConversations(req, context);
    case "POST":
      return await createConversation(req, context);
    default:
      return createErrorResponse("Method not allowed", HTTP_STATUS.METHOD_NOT_ALLOWED, ERROR_CODES.INVALID_INPUT);
  }
}

async function handleMessages(req: Request, conversationId: string, context: SecurityContext) {
  if (!InputSanitizer.isValidUUID(conversationId)) {
    return createErrorResponse("Invalid conversation ID format", HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_INPUT);
  }
  switch (req.method) {
    case "GET":
      return await getMessages(conversationId, context);
    case "POST":
      return await sendMessage(req, conversationId, context);
    default:
      return createErrorResponse("Method not allowed", HTTP_STATUS.METHOD_NOT_ALLOWED, ERROR_CODES.INVALID_INPUT);
  }
}

async function listConversations(req: Request, context: SecurityContext) {
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 50);
  const offset = parseInt(url.searchParams.get("offset") || "0");

  const { data, error } = await supabase
    .from("chat_conversations")
    .select(`
      id,
      title,
      tags,
      created_at,
      updated_at,
      chat_messages(count)
    `)
    .eq("user_id", context.userId)
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching conversations:", error);
    return createErrorResponse("Failed to fetch conversations", HTTP_STATUS.INTERNAL_ERROR, ERROR_CODES.DATABASE_ERROR);
  }

  const payload = sanitizeResponse({
    conversations: data ?? [],
    pagination: { limit, offset, total: data?.length ?? 0 },
  }, context.userRole);

  return new Response(JSON.stringify(payload), { headers: { "Content-Type": "application/json" } });
}

async function createConversation(req: Request, context: SecurityContext) {
  const body = await req.json().catch(() => ({}));
  let { title, initialMessage } = body as { title?: string; initialMessage?: string };

  // Make title optional; auto-derive when absent using initialMessage
  if (typeof initialMessage === "string") {
    initialMessage = InputSanitizer.sanitizeChatMessage(initialMessage);
  }
  if (!title || typeof title !== "string" || !title.trim()) {
    if (!initialMessage || !initialMessage.trim()) {
      return createErrorResponse("Provide either a title or an initialMessage", HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_INPUT);
    }
    title = deriveTitle(initialMessage);
  } else {
    title = InputSanitizer.sanitizeString(title, 200);
  }

  const { data: conversation, error: convError } = await supabase
    .from("chat_conversations")
    .insert({
      user_id: context.userId,
      title,
      tags: [],
    })
    .select()
    .single();

  if (convError) {
    console.error("Error creating conversation:", convError);
    return createErrorResponse("Failed to create conversation", HTTP_STATUS.INTERNAL_ERROR, ERROR_CODES.DATABASE_ERROR);
  }

  if (initialMessage && initialMessage.trim()) {
    await supabase.from("chat_messages").insert({
      conversation_id: conversation.id,
      content: initialMessage,
      role: "user",
      timestamp: new Date().toISOString(),
      metadata: { sanitized: true, initial_message: true },
    }).select().single();
  }

  const response = sanitizeResponse({ conversation, message: "Conversation created successfully" }, context.userRole);
  return new Response(JSON.stringify(response), { status: HTTP_STATUS.CREATED, headers: { "Content-Type": "application/json" } });
}

async function getMessages(conversationId: string, context: SecurityContext) {
  const { data: conversation, error: convError } = await supabase
    .from("chat_conversations")
    .select("id, user_id, org_id")
    .eq("id", conversationId)
    .single();
  if (convError || !conversation) {
    return createErrorResponse("Conversation not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }
  const hasAccess = conversation.user_id === context.userId || context.userRole === "consultant" || context.userRole === "admin";
  if (!hasAccess) {
    return createErrorResponse("Access denied to conversation", HTTP_STATUS.FORBIDDEN, ERROR_CODES.PERMISSION_DENIED);
  }

  const { data: messages, error: msgError } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("timestamp", { ascending: true });

  if (msgError) {
    console.error("Error fetching messages:", msgError);
    return createErrorResponse("Failed to fetch messages", HTTP_STATUS.INTERNAL_ERROR, ERROR_CODES.DATABASE_ERROR);
  }

  const payload = sanitizeResponse({ messages: messages || [] }, context.userRole);
  return new Response(JSON.stringify(payload), { headers: { "Content-Type": "application/json" } });
}

async function sendMessage(req: Request, conversationId: string, context: SecurityContext) {
  const body = await req.json();
  let { content, role } = body;

  if (!content || typeof content !== "string") {
    return createErrorResponse("Message content is required and must be a string", HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_INPUT);
  }

  try {
    content = InputSanitizer.sanitizeChatMessage(content);
    const securityCheck = InputSanitizer.validateMessageSecurity(content);
    if (!securityCheck.isValid) {
      return createErrorResponse(securityCheck.reason || "Message contains invalid content", HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_INPUT);
    }
  } catch {
    return createErrorResponse("Message content is invalid", HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_INPUT);
  }

  // Basic access guard
  const { data: conv } = await supabase
    .from("chat_conversations")
    .select("id,user_id,org_id,status,consultant_id")
    .eq("id", conversationId)
    .single();
  if (!conv) {
    return createErrorResponse("Conversation not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }
  const canSend = conv.user_id === context.userId || context.userRole === "consultant" || context.userRole === "admin";
  if (!canSend) return createErrorResponse("Access denied", HTTP_STATUS.FORBIDDEN, ERROR_CODES.PERMISSION_DENIED);

  let messageRole: "user" | "consultant" | "assistant" = "user";
  if (context.userRole === "consultant") messageRole = "consultant";
  else if (role === "assistant" && context.userRole === "admin") messageRole = "assistant";

  const { data: message, error: msgError } = await supabase
    .from("chat_messages")
    .insert({
      conversation_id: conversationId,
      content,
      role: messageRole,
      sender_type: messageRole,
      sender_id: context.userId,
      timestamp: new Date().toISOString(),
      metadata: { user_id: context.userId, user_role: context.userRole, sanitized: true },
    })
    .select()
    .single();

  if (msgError) {
    return createErrorResponse("Failed to send message", HTTP_STATUS.INTERNAL_ERROR, ERROR_CODES.DATABASE_ERROR);
  }

  await supabase.from("chat_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);

  return new Response(JSON.stringify({ message, success: true }), {
    status: 201,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

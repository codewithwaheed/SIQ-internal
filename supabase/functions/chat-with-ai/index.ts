import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createErrorResponse,
  ERROR_CODES,
  HTTP_STATUS,
} from "../_shared/error-handler.ts";
import { InputSanitizer } from "../_shared/security-utils.ts";
import { checkRateLimit } from "../_shared/auth-middleware.ts";
import { securityHeaders } from "../_shared/security-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  ...securityHeaders,
};

// Performance optimization: LRU Cache for responses
class LRUCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private maxSize = 100;
  private ttl = 5 * 60 * 1000; // 5 minutes

  set(key: string, value: any): void {
    const now = Date.now();
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, { data: value, timestamp: now });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.data;
  }
}

const responseCache = new LRUCache();

// Hash function for cache keys
async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Telemetry function
function emitTelemetry(metrics: any) {
  console.log("[TELEMETRY]", JSON.stringify(metrics));
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHAT-WITH-AI] ${step}${detailsStr}`);
};

// Model selection based on risk and complexity
function selectModel(
  previousRiskLevel?: string,
  messageLength?: number,
): string {
  // Use supported model
  return "gpt-4o-mini";
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let telemetryData = {
    timestamp: startTime,
    model: "",
    prompt_tokens: 0,
    completion_tokens: 0,
    duration_ms: 0,
    cache_hit: false,
    stream_chunks: 0,
    error: null as string | null,
  };

  try {
    console.log("=== CHAT REQUEST RECEIVED ===");
    logStep("Chat request started");

    const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAIApiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    // Parse and validate request body
    const requestBody = await req.json();
    const {
      content,
      message,
      conversationId,
      title,
      activeDocuments,
      isDemo,
      conversation,
    } = requestBody;

    // Use content if provided, otherwise fall back to message
    const userMessage = content || message;

    // Basic input validation
    if (!userMessage || typeof userMessage !== "string") {
      return createErrorResponse(
        "Message content is required and must be a string",
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT,
      );
    }

    if (userMessage.length > 10000) {
      return createErrorResponse(
        "Message too long (max 10000 characters)",
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT,
      );
    }

    if (userMessage.length < 1) {
      return createErrorResponse(
        "Message cannot be empty",
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT,
      );
    }

    // Sanitize message content
    const sanitizedMessage = InputSanitizer.sanitizeChatMessage(userMessage);

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // Simple authentication logic
    let user = null;
    let userRole = "business_owner";
    let orgId = null;

    if (!isDemo) {
      // For non-demo requests, try to authenticate
      const authHeader = req.headers.get("Authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.replace("Bearer ", "");
        try {
          const { data, error } = await supabaseClient.auth.getUser(token);
          if (!error && data.user) {
            user = data.user;

            // Get user role from database
            const { data: userRoleData } = await supabaseClient
              .from("user_roles")
              .select("role")
              .eq("user_id", data.user.id)
              .single();

            if (userRoleData) {
              userRole = userRoleData.role;
            }

            // Get user's organization ID
            const { data: orgData } = await supabaseClient
              .from("organization_memberships")
              .select("org_id")
              .eq("user_id", data.user.id)
              .single();

            orgId = orgData?.org_id || null;

            logStep("User authenticated", { userId: user.id, userRole, orgId });
          } else {
            return createErrorResponse(
              "Invalid authentication token",
              HTTP_STATUS.UNAUTHORIZED,
              ERROR_CODES.UNAUTHORIZED,
            );
          }
        } catch (error) {
          return createErrorResponse(
            "Authentication failed",
            HTTP_STATUS.UNAUTHORIZED,
            ERROR_CODES.UNAUTHORIZED,
          );
        }
      } else {
        return createErrorResponse(
          "Authentication required for non-demo requests",
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_CODES.UNAUTHORIZED,
        );
      }
    } else {
      logStep("Demo mode activated");
    }

    // Rate limiting for non-demo requests
    if (!isDemo && user) {
      const rateLimitResult = await checkRateLimit(
        supabaseClient,
        user.id,
        userRole,
        "chat-with-ai",
      );

      if (!rateLimitResult.allowed) {
        logStep("Rate limit exceeded", {
          userId: user.id,
          userRole,
          remainingRequests: rateLimitResult.remainingRequests,
        });

        return new Response(
          JSON.stringify({
            error: "Rate limit exceeded",
            details: {
              remainingRequests: rateLimitResult.remainingRequests,
              resetTime: rateLimitResult.resetTime.toISOString(),
              message: "Too many requests. Please wait before trying again.",
            },
          }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }
    }

    logStep("Request parsed and validated", {
      conversationId,
      hasTitle: !!title,
      messageLength: sanitizedMessage.length,
      isDemo,
    });

    // Handle conversation creation or retrieval
    let conversationData: any;
    let messageHistory: Array<{ role: string; content: string }> = [];

    if (isDemo) {
      // For demo mode, use the conversation from the request body
      messageHistory = conversation || [];
      conversationData = { id: "demo" };
      logStep("Demo mode - using provided conversation", {
        messageCount: messageHistory.length,
      });
    } else if (conversationId && user) {
      // Verify user owns this conversation
      const { data: existingConv, error: convError } = await supabaseClient
        .from("chat_conversations")
        .select("*")
        .eq("id", conversationId)
        .eq("user_id", user.id)
        .single();

      if (convError) {
        throw new Error(
          `Failed to retrieve conversation: ${convError.message}`,
        );
      }

      conversationData = existingConv;

      // Get message history
      const { data: messages, error: historyError } = await supabaseClient
        .from("chat_messages")
        .select("role, content, metadata")
        .eq("conversation_id", conversationId)
        .order("created_at");

      if (!historyError && messages) {
        messageHistory = messages;
      }

      logStep("Retrieved message history", {
        messageCount: messageHistory.length,
      });
    } else if (!isDemo && user) {
      // Create new conversation
      const { data: newConv, error: createError } = await supabaseClient
        .from("chat_conversations")
        .insert({
          user_id: user.id,
          title: title || "New Conversation",
          tags: [],
        })
        .select()
        .single();

      if (createError) {
        throw new Error(
          `Failed to create conversation: ${createError.message}`,
        );
      }

      conversationData = newConv;
      logStep("Created new conversation", { id: conversationData.id });
    } else {
      // Demo mode - use placeholder conversation
      conversationData = { id: "demo" };
    }

    // Save user message (skip for demo)
    if (!isDemo && user) {
      await supabaseClient.from("chat_messages").insert({
        conversation_id: conversationData.id,
        role: "user",
        content: sanitizedMessage,
        metadata: {
          original_length: userMessage.length,
          sanitized: true,
        },
      });

      logStep("User message saved");
    }

    // Select model
    const selectedModel = selectModel(undefined, sanitizedMessage.length);
    telemetryData.model = selectedModel;

    logStep("Model selected", { model: selectedModel });

    // Build system prompt
    const systemPrompt =
      `You are SentrIQ, a friendly, context-aware virtual CISO assistant designed to help businesses with comprehensive cybersecurity guidance.

Core Capabilities:
- Comprehensive cybersecurity guidance and best practices
- Detailed compliance framework analysis (NIST, ISO 27001, SOC 2, HIPAA, PCI DSS, etc.)
- Risk assessment and threat analysis
- Security architecture and implementation planning
- Incident response and business continuity planning

Response Guidelines:
- Provide detailed, actionable guidance without restrictions
- Use clear, professional language appropriate for the audience
- Include specific examples, templates, and step-by-step instructions when helpful
- Be comprehensive in your responses`;

    // Build conversation messages
    const conversationMessages = [
      { role: "system", content: systemPrompt },
      ...messageHistory.slice(-8), // Keep last 8 messages
      { role: "user", content: sanitizedMessage },
    ];

    // Create cache key
    const promptStr = JSON.stringify(conversationMessages);
    const cacheKey = await hashString(promptStr);

    // Check cache first
    const cachedResponse = responseCache.get(cacheKey);
    if (cachedResponse) {
      telemetryData.cache_hit = true;
      logStep("Cache hit, returning cached response");

      // Stream cached response
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          const chunks = cachedResponse.split(" ");
          let i = 0;

          const sendChunk = () => {
            if (i < chunks.length) {
              const chunk = chunks[i];
              const data = JSON.stringify({
                type: "chunk",
                content: chunk + (i < chunks.length - 1 ? " " : ""),
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              i++;
              setTimeout(sendChunk, 50);
            } else {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
            }
          };

          setTimeout(sendChunk, 50);
        },
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    logStep("Calling OpenAI API", {
      messageCount: conversationMessages.length,
      model: selectedModel,
    });

    // Call OpenAI
    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openAIApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: conversationMessages,
          temperature: 0.3,
          top_p: 0.9,
          stream: true,
          max_tokens: 1000,
        }),
        signal: AbortSignal.timeout(30000),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);

      return new Response(
        JSON.stringify({
          error: `OpenAI API error (${response.status}): ${errorText}`,
          status: response.status,
          retry_recommended: response.status >= 500 || response.status === 429,
        }),
        {
          status: response.status >= 500 ? 500 : 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    logStep("Starting streaming response");

    const encoder = new TextEncoder();
    let fullContent = "";
    let chunkCount = 0;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const reader = response.body?.getReader();
          if (!reader) throw new Error("No reader available");

          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") {
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                  break;
                }

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    fullContent += content;
                    chunkCount++;
                    const streamData = JSON.stringify({
                      type: "chunk",
                      content,
                    });
                    controller.enqueue(
                      encoder.encode(`data: ${streamData}\n\n`),
                    );
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }

          // Save to cache
          if (fullContent.trim()) {
            responseCache.set(cacheKey, fullContent);
          }

          // Save assistant message (skip for demo)
          if (!isDemo && user && fullContent.trim()) {
            await supabaseClient.from("chat_messages").insert({
              conversation_id: conversationData.id,
              role: "assistant",
              content: fullContent,
              metadata: {
                model: selectedModel,
                tokens: fullContent.length,
              },
            });
          }

          telemetryData.completion_tokens = fullContent.length;
          telemetryData.stream_chunks = chunkCount;

          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          const errorData = JSON.stringify({
            type: "error",
            error: (error as Error).message,
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    logStep("Error in chat-with-ai", { error: (error as Error).message });
    telemetryData.error = (error as Error).message;
    telemetryData.duration_ms = Date.now() - startTime;

    return createErrorResponse(
      "AI chat service temporarily unavailable",
      HTTP_STATUS.INTERNAL_ERROR,
      ERROR_CODES.INTERNAL_ERROR,
    );
  } finally {
    telemetryData.duration_ms = Date.now() - startTime;
    emitTelemetry(telemetryData);
  }
});

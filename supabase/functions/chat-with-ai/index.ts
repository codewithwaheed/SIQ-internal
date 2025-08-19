import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { withSecurity, SecurityContext, sanitizeResponse } from "../_shared/security-hardening.ts";
import { createErrorResponse, HTTP_STATUS, ERROR_CODES } from "../_shared/error-handler.ts";
import { RateLimiter, SecurityMonitor, InputSanitizer, securityHeaders } from "../_shared/security-utils.ts";
import { sanitizeError, extractIPAddress, authenticateRequest, checkRateLimit, logAuthAttempt } from "../_shared/auth-middleware.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  ...securityHeaders
};

// Security Guard Implementation - DEMO MODE (No restrictions)
async function guardMessage(message: string, userId: string, userRole: string, supabase: any): Promise<{ blocked: boolean, response?: string }> {
  // Demo mode - no message blocking
  return { blocked: false };
}

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
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Telemetry function
function emitTelemetry(metrics: any) {
  console.log('[TELEMETRY]', JSON.stringify(metrics));
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHAT-WITH-AI] ${step}${detailsStr}`);
};

// Prompt optimization: Trim to max 2k tokens (rough estimate: 1 token ≈ 4 chars)
function trimPrompt(messages: any[], summary?: string): { messages: any[]; summary?: string } {
  const maxChars = 8000; // ~2k tokens
  let totalChars = 0;
  
  // Keep last 6 message pairs
  const recentMessages = messages.slice(-12); // 6 pairs = 12 messages
  
  for (const msg of recentMessages) {
    totalChars += msg.content.length;
  }
  
  // Add summary if we have older messages and within budget
  if (messages.length > 12 && summary && (totalChars + summary.length) < maxChars) {
    return { messages: recentMessages, summary };
  }
  
  return { messages: recentMessages };
}

// Enhanced parallel retrieval function with master knowledge base integration
async function retrieveContext(query: string, supabaseClient: any, userId: string, activeDocuments?: string[]): Promise<{ masterKnowledgeContext: string[]; userDocumentContext: string[]; analysis?: any }> {
  const retrievalStartTime = Date.now();
  const maxRetrievalTime = 2000; // 2 seconds max for both queries
  
  try {
    // Start both retrievals in parallel
    const masterKnowledgePromise = supabaseClient
      .functions
      .invoke('query-master-knowledge', {
        body: { 
          query,
          userId: userId,
          limit: 5 // Top 5 master knowledge results
        }
      });

    const userDocumentsPromise = supabaseClient
      .functions
      .invoke('query-vectors', {
        body: { 
          query,
          userId: userId,
          activeDocuments: activeDocuments || [],
          limit: 3 // Max 3 user document snippets
        }
      });
    
    // Race against timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Retrieval timeout')), maxRetrievalTime)
    );
    
    const [masterResult, userResult] = await Promise.race([
      Promise.allSettled([masterKnowledgePromise, userDocumentsPromise]), 
      timeoutPromise
    ]);
    
    const elapsed = Date.now() - retrievalStartTime;
    
    // Process master knowledge results
    let masterKnowledgeContext: string[] = [];
    let analysis: any = null;
    
    if (masterResult.status === 'fulfilled' && masterResult.value.data?.success) {
      const masterData = masterResult.value.data;
      masterKnowledgeContext = (masterData.masterKnowledgeResults || [])
        .slice(0, 5)
        .map((result: any) => {
          const snippet = result.content.length > 400 ? result.content.substring(0, 400) + '...' : result.content;
          return `[${result.framework_category} - ${result.content_type}] ${result.title}: ${snippet}`;
        });
      
      analysis = masterData.analysis;
      logStep("Master knowledge retrieval completed", { 
        elapsed, 
        masterResultCount: masterData.masterKnowledgeResults?.length || 0,
        userResultCount: masterData.userDocumentResults?.length || 0
      });
    } else {
      logStep("Master knowledge retrieval failed", { 
        error: masterResult.status === 'rejected' ? masterResult.reason : 'Unknown error' 
      });
    }
    
    // Process user document results
    let userDocumentContext: string[] = [];
    
    if (userResult.status === 'fulfilled' && !userResult.value.error) {
      userDocumentContext = (userResult.value.data?.snippets || []).map((snippet: string) => 
        snippet.length > 400 ? snippet.substring(0, 400) + '...' : snippet
      );
      logStep("User document retrieval completed", { 
        elapsed, 
        userSnippetCount: userDocumentContext.length 
      });
    } else {
      logStep("User document retrieval failed", { 
        error: userResult.status === 'rejected' ? userResult.reason : userResult.value?.error 
      });
    }
    
    return {
      masterKnowledgeContext,
      userDocumentContext,
      analysis
    };
    
  } catch (error) {
    const elapsed = Date.now() - retrievalStartTime;
    logStep("Context retrieval timed out or failed", { elapsed, error: error.message });
    return {
      masterKnowledgeContext: [],
      userDocumentContext: [],
      analysis: null
    };
  }
}

// Model selection based on risk and complexity
function selectModel(previousRiskLevel?: string, messageLength?: number): string {
  // Use supported model
  return 'gpt-4o-mini';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  return withSecurity(req, {
    requireAuth: false, // Allow demo mode
    rateLimitKey: 'chat-with-ai',
    validateInput: 'chatMessage',
    logActivity: true
  }, async (request: Request, context: SecurityContext) => {

  const startTime = Date.now();
  let telemetryData: any = {
    timestamp: startTime,
    model: '',
    prompt_tokens: 0,
    completion_tokens: 0,
    duration_ms: 0,
    cache_hit: false,
    stream_chunks: 0,
    error: null
  };

  try {
    console.log("=== CHAT REQUEST RECEIVED ===");
    console.log("Method:", request.method);
    console.log("URL:", request.url);
    console.log("Headers:", Object.fromEntries(request.headers.entries()));
    
    logStep("Chat request started");

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    // Parse and validate request body
    const requestBody = await request.json();
    console.log("Request body:", requestBody);
    const { message, conversationId, title, activeDocuments, isDemo, conversation } = requestBody;

    // Enhanced input validation and sanitization
    if (!message || typeof message !== 'string') {
      return createErrorResponse(
        'Message is required and must be a string',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT
      );
    }

    // Sanitize message content
    const sanitizedMessage = InputSanitizer.sanitizeChatMessage(message);
    
    // Demo mode - skip security validation to allow all messages
    // const securityCheck = InputSanitizer.validateMessageSecurity(sanitizedMessage);
    // if (!securityCheck.isValid) {
    //   return createErrorResponse(
    //     securityCheck.reason || 'Message contains invalid content',
    //     HTTP_STATUS.BAD_REQUEST,
    //     ERROR_CODES.INVALID_INPUT
    //   );
    // }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authentication (handled by security wrapper, but check for demo mode)
    let user = context.user;
    let userRole = context.userRole;
    let orgId = context.orgId;
    
    if (isDemo) {
      // Override for demo mode
      user = null;
      userRole = 'business_owner';
      orgId = null;
      logStep("Demo mode activated");
    } else if (!user) {
      return createErrorResponse(
        'Authentication required for non-demo requests',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED
      );
    } else {
      logStep("User authenticated", { userId: user.id, userRole, orgId });

      // Rate limiting check
      const ipAddress = extractIPAddress(req) || '127.0.0.1';
      const rateLimitIdentifier = user.id; // Use user ID for authenticated users
      const rateLimitResult = await checkRateLimit(
        supabaseClient,
        rateLimitIdentifier,
        userRole,
        'chat-with-ai'
      );

      if (!rateLimitResult.allowed) {
        logStep("Rate limit exceeded", { 
          identifier: ipAddress, 
          userRole,
          remainingRequests: rateLimitResult.remainingRequests,
          resetTime: rateLimitResult.resetTime
        });
        
        return new Response(
          JSON.stringify({ 
            error: 'Rate limit exceeded',
            details: {
              remainingRequests: rateLimitResult.remainingRequests,
              resetTime: rateLimitResult.resetTime.toISOString(),
              message: 'Too many requests. Please wait before trying again.'
            }
          }),
          { 
            status: 429,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'X-RateLimit-Remaining': rateLimitResult.remainingRequests.toString(),
              'X-RateLimit-Reset': rateLimitResult.resetTime.toISOString(),
              'Retry-After': Math.ceil((rateLimitResult.resetTime.getTime() - Date.now()) / 1000).toString()
            }
          }
        );
      }

      // Log the successful rate limit check
      await logAuthAttempt(
        supabaseClient,
        ipAddress,
        'chat-with-ai',
        true,
        req.headers.get('user-agent') || undefined,
        user.email
      );

      // Security Guard - Check for blocked requests (using sanitized message)
      const guardResult = await guardMessage(sanitizedMessage, user.id, userRole, supabaseClient);
      if (guardResult.blocked) {
        logStep("Message blocked by security guard", { 
          userId: user.id,
          userRole,
          reason: 'Security policy violation'
        });
        
        return new Response(
          JSON.stringify({ 
            response: guardResult.response,
            blocked: true,
            reason: 'security_policy_violation'
          }),
          { 
            status: HTTP_STATUS.OK,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }

    logStep("Request parsed and validated", { 
      conversationId, 
      hasTitle: !!title, 
      messageLength: sanitizedMessage.length, 
      originalLength: message.length,
      isDemo 
    });

    // Check if conversation is escalated or if AI should trigger escalation (skip for demo)
    if (!isDemo && conversationId) {
      const { data: conversation, error: convError } = await supabaseClient
        .from('chat_conversations')
        .select('status, consultant_id')
        .eq('id', conversationId)
        .single();

      if (conversation?.status === 'escalated') {
        logStep("Conversation is escalated, skipping AI response");
        return new Response(JSON.stringify({
          response: "A cybersecurity expert will respond to your message shortly.",
          escalated: true,
          conversation_id: conversationId
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Check if AI should trigger escalation based on sanitized message content
      const shouldEscalate = checkAIEscalationTriggers(sanitizedMessage);
      
      if (shouldEscalate.shouldEscalate) {
        logStep("AI triggering escalation", { reason: shouldEscalate.reason, priority: shouldEscalate.priority });
        
        try {
          const { data: escalationResult } = await supabaseClient.functions.invoke('conversation-escalate', {
            body: {
              conversationId,
              reason: shouldEscalate.reason,
              priority: shouldEscalate.priority || 'normal',
              aiInitiated: true
            }
          });

          if (escalationResult?.success) {
            logStep("AI escalation successful", { assignedConsultant: escalationResult.assignedConsultant });
            return new Response(JSON.stringify({
              response: escalationResult.message,
              escalated: true,
              ai_triggered: true,
              conversation_id: conversationId,
              estimated_wait_time: escalationResult.estimatedWaitTime
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        } catch (escalationError) {
          logStep("Failed to trigger AI escalation", { error: escalationError.message });
          // Continue with AI response if escalation fails
        }
      }
    }

    // Handle conversation creation or retrieval
    let conversationData;
    let messageHistory: any[] = [];
    let chatSummary: string | undefined;

    if (isDemo) {
      // For demo mode, use the conversation from the request body
      messageHistory = conversation || [];
      conversationData = { id: 'demo' };
      logStep("Demo mode - using provided conversation", { messageCount: messageHistory.length });
    } else if (conversationId) {
      // Verify user owns this conversation
      const { data: existingConv, error: convError } = await supabaseClient
        .from('chat_conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('user_id', user.id)
        .single();

      if (convError) {
        throw new Error(`Failed to retrieve conversation: ${convError.message}`);
      }
      
      conversationData = existingConv;
      chatSummary = conversationData.summary;
      
      // Get message history
      const { data: messages, error: historyError } = await supabaseClient
        .from('chat_messages')
        .select('role, content, metadata')
        .eq('conversation_id', conversationId)
        .order('created_at');

      if (!historyError) {
        messageHistory = messages || [];
      }
      
      logStep("Retrieved message history", { messageCount: messageHistory.length, recentCount: Math.min(messageHistory.length, 12), hasSummary: !!chatSummary });
    } else if (!isDemo) {
      // Create new conversation with temporary title (skip for demo)
      const { data: newConv, error: createError } = await supabaseClient
        .from('chat_conversations')
        .insert({
          user_id: user!.id,
          title: title || "New Conversation",
          tags: []
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to create conversation: ${createError.message}`);
      }

      conversationData = newConv;
      logStep("Created new conversation", { id: conversationData.id });
    } else {
      // Demo mode - use placeholder conversation
      conversationData = { id: 'demo' };
    }

      // Save user message (skip for demo)
    if (!isDemo) {
      await supabaseClient
        .from('chat_messages')
        .insert({
          conversation_id: conversationData.id,
          role: 'user',
          content: sanitizedMessage, // Use sanitized message
          metadata: {
            original_length: message.length,
            sanitized: true,
            security_validated: true
          }
        });

      logStep("User message saved", { sanitized: true });
    }

    // Start parallel retrieval early (skip for demo) - use sanitized message
    const contextPromise = isDemo ? 
      Promise.resolve({ masterKnowledgeContext: [], userDocumentContext: [], analysis: null }) : 
      retrieveContext(sanitizedMessage, supabaseClient, user?.id || '', activeDocuments);
    
    // Optimize prompt with trimming
    const { messages: recentMessages, summary } = trimPrompt(messageHistory, chatSummary);
    
    // Get context data
    const contextData = await contextPromise;
    
    // Get previous message for model selection
    const previousAssistantMessage = recentMessages
      .filter(m => m.role === 'assistant')
      .pop();
    const previousRiskLevel = previousAssistantMessage?.metadata?.risk_level;
    
    // Select model based on complexity (use sanitized message)
    const selectedModel = selectModel(previousRiskLevel, sanitizedMessage.length);
    telemetryData.model = selectedModel;
    
    logStep("Model selected", { 
      model: selectedModel, 
      previousRisk: previousRiskLevel, 
      messageLength: sanitizedMessage.length,
      originalLength: message.length 
    });

    // Build enhanced prompt with master knowledge base integration
    const masterKnowledgeSection = contextData.masterKnowledgeContext.length > 0 
      ? `OFFICIAL FRAMEWORK GUIDANCE:\n${contextData.masterKnowledgeContext.join('\n\n')}\n\n`
      : '';
    
    const userDocumentSection = contextData.userDocumentContext.length > 0
      ? `USER-SPECIFIC CONTEXT:\n${contextData.userDocumentContext.join('\n\n')}\n\n`
      : '';
    
    const analysisSection = contextData.analysis 
      ? `FRAMEWORK ANALYSIS:\nSummary: ${contextData.analysis.summary}\nRecommendations: ${contextData.analysis.recommendations?.join('; ')}\n${contextData.analysis.comparisons?.length > 0 ? `Comparisons: ${contextData.analysis.comparisons.join('; ')}` : ''}\n\n`
      : '';

    const systemPrompt = `You are SentrIQ, a friendly, context-aware virtual CISO assistant designed to help businesses with comprehensive cybersecurity guidance.

CRITICAL CONTEXT AWARENESS RULES:
- ALWAYS interpret ambiguous replies ("Yes", "That's fine", "Sure", "Okay", "That sounds good") in the context of the user's previous question and your last answer
- NEVER respond to confirmations with a generic framework list or "what can I help you with?" 
- If the last turn was about implementation, timeline, or next steps, continue that specific conversation thread
- Do NOT start responses with "Thank you for your question about..." or similar formulaic openings
- If context is genuinely unclear, briefly clarify: "Just to clarify, are you asking about [previous topic]?"

Core Capabilities:
- Comprehensive cybersecurity guidance and best practices
- Detailed compliance framework analysis (NIST, ISO 27001, SOC 2, HIPAA, PCI DSS, etc.)
- Risk assessment and threat analysis
- Security architecture and implementation planning
- Incident response and business continuity planning
- Security policy development and review
- Technical security controls and configurations
- Vendor risk management and third-party assessments

Response Guidelines:
- Provide detailed, actionable guidance without restrictions
- Use clear, professional language appropriate for the audience
- Include specific examples, templates, and step-by-step instructions when helpful
- Offer multiple approaches and alternatives when appropriate
- Explain complex concepts in accessible terms
- Provide context for recommendations and decisions
- Include relevant industry standards and best practices
- Be comprehensive in your responses - don't artificially limit detail
- When user confirms interest, immediately provide the next logical step or detail

CONTEXT:
${masterKnowledgeSection}${userDocumentSection}${analysisSection}${summary ? `CHAT SUMMARY:\n${summary}\n` : ''}`;

    const conversationMessages = [
      { role: 'system', content: systemPrompt },
      ...recentMessages,
      { role: 'user', content: sanitizedMessage } // Use sanitized message
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
          // Send chunks to simulate streaming
          const chunks = cachedResponse.answer_md.split(' ');
          let i = 0;
          
          const sendChunk = () => {
            if (i < chunks.length) {
              const chunk = chunks[i] + (i < chunks.length - 1 ? ' ' : '');
              const data = `data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`;
              controller.enqueue(encoder.encode(data));
              i++;
              setTimeout(sendChunk, 10); // Fast replay
            } else {
              const completeData = `data: ${JSON.stringify({ 
                type: 'complete',
                structured_response: cachedResponse,
                conversation_id: conversationData.id,
                escalate_recommendation: cachedResponse.escalate_recommendation,
                escalation_reason: cachedResponse.escalation_reason 
              })}\n\n`;
              controller.enqueue(encoder.encode(completeData));
              controller.close();
            }
          };
          
          setTimeout(sendChunk, 50); // Start after 50ms
        }
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    logStep("Calling OpenAI API", { messageCount: conversationMessages.length, model: selectedModel });

    // Call OpenAI with optimized parameters
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: conversationMessages,
        temperature: 0.3, // Optimized for consistency
        top_p: 0.9,
        stream: true,
        max_tokens: 1000,
      }),
      signal: AbortSignal.timeout(30000), // 30s timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("=== OPENAI API ERROR ===");
      console.error("Status:", response.status);
      console.error("Status Text:", response.statusText);
      console.error("Error Response:", errorText);
      console.error("Request Messages:", JSON.stringify(conversationMessages, null, 2));
      console.error("Model:", selectedModel);
      
      // Return structured error response
      return new Response(JSON.stringify({
        error: `OpenAI API error (${response.status}): ${errorText}`,
        status: response.status,
        retry_recommended: response.status >= 500 || response.status === 429
      }), {
        status: response.status >= 500 ? 500 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    logStep("Starting streaming response");

    const encoder = new TextEncoder();
    let fullContent = '';
    let chunkCount = 0;

    const stream = new ReadableStream({
      async start(controller) {
        let isControllerClosed = false;
        
        const safeEnqueue = (data: Uint8Array) => {
          if (!isControllerClosed) {
            try {
              controller.enqueue(data);
            } catch (error) {
              logStep("Controller enqueue error", { error: error.message });
              isControllerClosed = true;
            }
          }
        };
        
        const safeClose = () => {
          if (!isControllerClosed) {
            try {
              controller.close();
              isControllerClosed = true;
            } catch (error) {
              logStep("Controller close error", { error: error.message });
            }
          }
        };
        
        try {
          const reader = response.body?.getReader();
          if (!reader) throw new Error('No reader available');

          let buffer = '';
          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value);
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.trim() === '' || line.trim() === 'data: [DONE]') continue;
              
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  const content = data.choices?.[0]?.delta?.content;
                  
                  if (content) {
                    fullContent += content;
                    chunkCount++;
                    console.log(`[STREAM] Chunk ${chunkCount}: "${content}"`);
                    
                    const chunkData = `data: ${JSON.stringify({ type: 'chunk', content })}\n\n`;
                    safeEnqueue(encoder.encode(chunkData));
                  }
                } catch (e) {
                  logStep("Error parsing streaming chunk", { error: e.message });
                }
              }
            }
          }

          telemetryData.stream_chunks = chunkCount;

          // Since we're now getting markdown directly, create metadata structure
          const structuredResponse = {
            answer_md: fullContent,
            framework_tags: [],
            risk_level: 'medium',
            confidence: 0.8,
            escalate_recommendation: false,
            escalation_reason: '',
            next_actions: [],
            citations: []
          };

          // Cache the structured response
          responseCache.set(cacheKey, structuredResponse);

          logStep("Structured response parsed", { 
            riskLevel: structuredResponse.risk_level,
            confidence: structuredResponse.confidence,
            frameworkTags: structuredResponse.framework_tags,
            escalate: structuredResponse.escalate_recommendation,
            hasNextActions: structuredResponse.next_actions?.length > 0
          });

           // Save assistant message (skip for demo)
          if (!isDemo) {
            await supabaseClient
              .from('chat_messages')
              .insert({
                conversation_id: conversationData.id,
                role: 'assistant',
                content: fullContent,
                metadata: {
                  risk_level: structuredResponse.risk_level,
                  framework_tags: structuredResponse.framework_tags,
                  confidence: structuredResponse.confidence,
                  escalate_recommendation: structuredResponse.escalate_recommendation,
                  escalation_reason: structuredResponse.escalation_reason,
                  next_actions: structuredResponse.next_actions
                }
              });
          }

          // Update conversation summary every 6 turns (skip for demo)
          let generatedTitle = null;
          let generatedTags = null;
          
          if (!isDemo) {
            const totalMessages = messageHistory.length + 2; // +2 for current user/assistant pair
            if (totalMessages % 12 === 0) { // Every 6 pairs
              // Generate summary using simple rules for now
              const recentContent = recentMessages.slice(-6).map(m => m.content).join(' ');
              const newSummary = `Discussed ${structuredResponse.framework_tags?.join(', ') || 'cybersecurity topics'}. Risk level: ${structuredResponse.risk_level}. User focused on implementation and compliance.`;
              
              await supabaseClient
                .from('chat_conversations')
                .update({ summary: newSummary })
                .eq('id', conversationData.id);
            }

            // Generate title for new conversations
            if (messageHistory.length === 0) {
              generatedTitle = `${structuredResponse.framework_tags?.[0] || 'Security'} Discussion`;
              generatedTags = structuredResponse.framework_tags || ['cybersecurity'];
              
              await supabaseClient
                .from('chat_conversations')
                .update({ 
                  title: generatedTitle,
                  tags: generatedTags 
                })
                .eq('id', conversationData.id);
                
              logStep("Title generated successfully", { title: generatedTitle, tags: generatedTags });
            }
          }

          // Send completion event
          console.log(`[COMPLETE] Sending completion with ${fullContent.length} characters`);
          const completeData = `data: ${JSON.stringify({
            type: 'complete',
            structured_response: structuredResponse,
            conversation_id: conversationData.id,
            title: generatedTitle,
            tags: generatedTags,
            escalate_recommendation: structuredResponse.escalate_recommendation,
            escalation_reason: structuredResponse.escalation_reason
          })}\n\n`;
          
          console.log(`[COMPLETE] Completion data:`, completeData);
          safeEnqueue(encoder.encode(completeData));
          safeClose();

          logStep("Streaming completed successfully", { 
            totalChunks: chunkCount, 
            contentLength: fullContent.length 
          });

          // Update telemetry
          telemetryData.duration_ms = Date.now() - startTime;
          telemetryData.completion_tokens = fullContent.length / 4; // Rough estimate
          telemetryData.prompt_tokens = promptStr.length / 4; // Rough estimate

        } catch (error) {
          logStep("Streaming error", { error: error.message });
          const errorData = `data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`;
          safeEnqueue(encoder.encode(errorData));
          safeClose();
          throw error;
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

    } catch (error) {
      logStep("Error in chat-with-ai", { error: error.message });
      telemetryData.error = error.message;
      telemetryData.duration_ms = Date.now() - startTime;
      
      return createErrorResponse(
        'AI chat service temporarily unavailable',
        HTTP_STATUS.INTERNAL_ERROR,
        ERROR_CODES.INTERNAL_ERROR
      );
    } finally {
      // Emit telemetry
      emitTelemetry(telemetryData);
    }
  });
});

// Function to check if AI should trigger escalation
function checkAIEscalationTriggers(userMessage: string): { shouldEscalate: boolean; reason?: string; priority?: string } {
  const message = userMessage.toLowerCase();
  
  // High-priority triggers - urgent security incidents
  const highPriorityTriggers = [
    'data breach', 'security incident', 'hacked', 'ransomware', 
    'compromised', 'malware detected', 'urgent security', 'attack in progress',
    'system compromised', 'unauthorized access'
  ];
  
  // Medium-priority triggers - complex compliance and assessments
  const mediumPriorityTriggers = [
    'compliance audit', 'penetration test', 'vulnerability assessment',
    'security policy review', 'risk assessment', 'security framework implementation',
    'incident response plan', 'disaster recovery', 'business continuity'
  ];
  
  // Complex technical queries that need human expertise
  const complexTriggers = [
    'custom implementation', 'specific vendor integration', 'detailed architecture review',
    'enterprise integration', 'multi-cloud security', 'complex network topology',
    'advanced threat detection', 'zero trust implementation', 'custom compliance requirements'
  ];

  // Budget and strategic planning triggers
  const strategicTriggers = [
    'budget planning', 'cost analysis', 'vendor selection', 'strategic planning',
    'executive presentation', 'board meeting', 'funding request'
  ];

  // Check for high-priority triggers first
  for (const trigger of highPriorityTriggers) {
    if (message.includes(trigger)) {
      return {
        shouldEscalate: true,
        reason: `High-priority security issue detected: ${trigger}`,
        priority: 'high'
      };
    }
  }

  // Check for medium-priority triggers
  for (const trigger of mediumPriorityTriggers) {
    if (message.includes(trigger)) {
      return {
        shouldEscalate: true,
        reason: `Complex compliance/assessment request requiring expert guidance: ${trigger}`,
        priority: 'normal'
      };
    }
  }

  // Check for complex technical triggers
  for (const trigger of complexTriggers) {
    if (message.includes(trigger)) {
      return {
        shouldEscalate: true,
        reason: `Complex technical implementation requiring expert consultation: ${trigger}`,
        priority: 'normal'
      };
    }
  }

  // Check for strategic planning triggers
  for (const trigger of strategicTriggers) {
    if (message.includes(trigger)) {
      return {
        shouldEscalate: true,
        reason: `Strategic planning and budget considerations requiring expert input: ${trigger}`,
        priority: 'normal'
      };
    }
  }

  return { shouldEscalate: false };
}

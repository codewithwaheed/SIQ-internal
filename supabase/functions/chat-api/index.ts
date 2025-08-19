import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { withSecurity, SecurityContext, sanitizeResponse } from '../_shared/security-hardening.ts';
import { createErrorResponse, HTTP_STATUS, ERROR_CODES } from '../_shared/error-handler.ts';
import { InputSanitizer } from '../_shared/security-utils.ts';
import { authenticateRequest, checkRateLimit, extractIPAddress } from '../_shared/auth-middleware.ts';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface ChatMessage {
  id: string;
  conversation_id: string;
  content: string;
  role: 'user' | 'assistant' | 'consultant' | 'system';
  timestamp: string;
  metadata?: Record<string, any>;
}

interface Conversation {
  id: string;
  user_id: string;
  title: string;
  status: 'active' | 'escalated' | 'resolved' | 'archived';
  escalation_id?: string;
  last_message_at?: string;
  created_at: string;
  updated_at: string;
  org_id: string;
  tags?: string[];
}

Deno.serve(async (req) => {
  return withSecurity(req, {
    requireAuth: true,
    rateLimitKey: 'chat-api',
    logActivity: true
  }, async (request: Request, context: SecurityContext) => {
    console.log(`Processing ${request.method} request for chat API`);
    
    // Use security context from wrapper
    const authResult = {
      userId: context.userId,
      userRole: context.userRole,
      orgId: context.orgId,
      user: context.user
    };
    
    console.log('Authentication result:', {
      userId: authResult.userId,
      userRole: authResult.userRole,
      orgId: authResult.orgId
    });

    // Rate limiting is handled by security wrapper
    const url = new URL(request.url);
    const endpoint = url.pathname.split('/').pop();

    // Route to appropriate handler
    const pathSegments = url.pathname.split('/').filter(Boolean);
    
    if (pathSegments.length === 1 && pathSegments[0] === 'conversations') {
      return await handleConversations(request, authResult, context);
    } else if (pathSegments.length === 3 && pathSegments[0] === 'conversations' && pathSegments[2] === 'messages') {
      const conversationId = pathSegments[1];
      return await handleMessages(request, conversationId, authResult, context);
    } else {
      return createErrorResponse(
        'Invalid endpoint',
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND
      );
    }
  });
});

// Handle /conversations endpoint
async function handleConversations(req: Request, authResult: any, context: SecurityContext) {
  switch (req.method) {
    case 'GET':
      return await listConversations(req, authResult, context);
    case 'POST':
      return await createConversation(req, authResult, context);
    default:
      return createErrorResponse(
        'Method not allowed',
        HTTP_STATUS.METHOD_NOT_ALLOWED,
        ERROR_CODES.INVALID_INPUT
      );
  }
}

// Handle /conversations/{id}/messages endpoint
async function handleMessages(req: Request, conversationId: string, authResult: any, context: SecurityContext) {
  // Validate conversation ID format
  if (!InputSanitizer.isValidUUID(conversationId)) {
    return createErrorResponse(
      'Invalid conversation ID format',
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.INVALID_INPUT
    );
  }

  switch (req.method) {
    case 'GET':
      return await getMessages(conversationId, authResult, context);
    case 'POST':
      return await sendMessage(req, conversationId, authResult, context);
    default:
      return createErrorResponse(
        'Method not allowed',
        HTTP_STATUS.METHOD_NOT_ALLOWED,
        ERROR_CODES.INVALID_INPUT
      );
  }
}

// List user's conversations
async function listConversations(req: Request, authResult: any, context: SecurityContext) {
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
  const offset = parseInt(url.searchParams.get('offset') || '0');
  const status = url.searchParams.get('status');

  let query = supabase
    .from('chat_conversations')
    .select(`
      id,
      title,
      created_at,
      updated_at,
      tags,
      chat_messages(count)
    `)
    .eq('user_id', authResult.userId)
    .eq('org_id', authResult.orgId)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    // Note: We'd need to add a status column to chat_conversations table
    // For now, we'll use a simple active/inactive logic based on recent activity
  }

  const { data: conversations, error } = await query;

  if (error) {
    console.error('Error fetching conversations:', error);
    return createErrorResponse(
      'Failed to fetch conversations',
      HTTP_STATUS.INTERNAL_ERROR,
      ERROR_CODES.DATABASE_ERROR
    );
  }

  const sanitizedData = sanitizeResponse({
    conversations: conversations || [],
    pagination: {
      limit,
      offset,
      total: conversations?.length || 0
    }
  }, context.userRole);

  return new Response(
    JSON.stringify(sanitizedData),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

// Create new conversation
async function createConversation(req: Request, authResult: any, context: SecurityContext) {
  const body = await req.json();
  let { title, initialMessage } = body;

  if (!title || typeof title !== 'string') {
    return createErrorResponse(
      'Title is required and must be a string',
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.INVALID_INPUT
    );
  }

  // Sanitize inputs
  title = InputSanitizer.sanitizeString(title, 200);
  if (initialMessage) {
    initialMessage = InputSanitizer.sanitizeChatMessage(initialMessage);
  }

  // Create conversation
  const { data: conversation, error: convError } = await supabase
    .from('chat_conversations')
    .insert({
      user_id: authResult.userId,
      org_id: authResult.orgId,
      title,
      tags: []
    })
    .select()
    .single();

  if (convError) {
    console.error('Error creating conversation:', convError);
    return createErrorResponse(
      'Failed to create conversation',
      HTTP_STATUS.INTERNAL_ERROR,
      ERROR_CODES.DATABASE_ERROR
    );
  }

  // Add initial message if provided
  if (initialMessage) {
    const { error: msgError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversation.id,
        content: initialMessage,
        role: 'user',
        timestamp: new Date().toISOString(),
        metadata: {
          sanitized: true,
          initial_message: true
        }
      });

    if (msgError) {
      console.error('Error adding initial message:', msgError);
      // Don't fail the conversation creation, just log the error
    }
  }

  // Log conversation creation
  await supabase.from('audit_logs').insert({
    action: 'CONVERSATION_CREATED',
    description: `New conversation created: ${title}`,
    user_id: authResult.userId,
    metadata: {
      conversation_id: conversation.id,
      title,
      has_initial_message: !!initialMessage,
      security_level: 'LOW'
    },
    ip_address: context.ipAddress,
    user_agent: context.userAgent
  });

  const sanitizedResponse = sanitizeResponse({
    conversation,
    message: 'Conversation created successfully'
  }, context.userRole);

  return new Response(
    JSON.stringify(sanitizedResponse),
    { status: HTTP_STATUS.CREATED, headers: { 'Content-Type': 'application/json' } }
  );
}

// Get messages for a conversation
async function getMessages(conversationId: string, authResult: any, context: SecurityContext) {
  // First verify the user has access to this conversation
  const { data: conversation, error: convError } = await supabase
    .from('chat_conversations')
    .select('id, user_id, org_id')
    .eq('id', conversationId)
    .single();

  if (convError || !conversation) {
    return createErrorResponse(
      'Conversation not found',
      HTTP_STATUS.NOT_FOUND,
      ERROR_CODES.NOT_FOUND
    );
  }

  // Check access permissions
  const hasAccess = conversation.user_id === authResult.userId || 
                   (authResult.userRole === 'consultant' || authResult.userRole === 'admin');

  if (!hasAccess) {
    return createErrorResponse(
      'Access denied to conversation',
      HTTP_STATUS.FORBIDDEN,
      ERROR_CODES.PERMISSION_DENIED
    );
  }

  // Fetch messages
  const { data: messages, error: msgError } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('timestamp', { ascending: true });

  if (msgError) {
    console.error('Error fetching messages:', msgError);
    return createErrorResponse(
      'Failed to fetch messages',
      HTTP_STATUS.INTERNAL_ERROR,
      ERROR_CODES.DATABASE_ERROR
    );
  }

  const sanitizedMessages = sanitizeResponse({ messages: messages || [] }, context.userRole);

  return new Response(
    JSON.stringify(sanitizedMessages),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

// Send a new message with enhanced security and async processing
async function sendMessage(req: Request, conversationId: string, authResult: any, context: SecurityContext) {
  const body = await req.json();
  let { content, role } = body;

  if (!content || typeof content !== 'string') {
    return createErrorResponse(
      'Message content is required and must be a string',
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.INVALID_INPUT
    );
  }

  // Enhanced content sanitization and validation
  try {
    content = InputSanitizer.sanitizeChatMessage(content);
    const securityCheck = InputSanitizer.validateMessageSecurity(content);
    if (!securityCheck.isValid) {
      return createErrorResponse(
        securityCheck.reason || 'Message contains invalid content',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT
      );
    }
  } catch (error) {
    return createErrorResponse(
      'Message content is invalid',
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.INVALID_INPUT
    );
  }

  // Verify conversation exists and check access using security function
  const { data: hasAccess } = await supabase.rpc('can_access_conversation', {
    conversation_id: conversationId,
    user_id: authResult.userId,
    user_role: authResult.userRole
  });

  if (!hasAccess) {
    return new Response(
      JSON.stringify({ error: 'Access denied: Cannot access this conversation' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get conversation details for status checking
  const { data: conversation, error: convError } = await supabase
    .from('chat_conversations')
    .select('id, user_id, org_id, status, consultant_id')
    .eq('id', conversationId)
    .single();

  if (convError || !conversation) {
    return new Response(
      JSON.stringify({ error: 'Conversation not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check if conversation is closed
  if (conversation.status === 'closed' && authResult.userRole !== 'admin') {
    return new Response(
      JSON.stringify({ 
        error: 'Conversation is closed',
        suggestion: 'Create a new conversation to continue chatting',
        closed_conversation_id: conversationId
      }),
      { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Determine sender role and validate permissions
  let messageRole = 'user';
  if (authResult.userRole === 'consultant') {
    messageRole = 'consultant';
    // If consultant is messaging, automatically assign them to escalated conversations
    if (conversation.status === 'escalated' && !conversation.consultant_id) {
      await supabase
        .from('chat_conversations')
        .update({ consultant_id: authResult.userId })
        .eq('id', conversationId);
    }
  } else if (role === 'assistant' && authResult.userRole === 'admin') {
    messageRole = 'assistant'; // Admin can send AI messages for testing
  }

  // Enhanced permission check
  const canSend = conversation.user_id === authResult.userId || 
                  authResult.userRole === 'consultant' || 
                  authResult.userRole === 'admin';

  if (!canSend) {
    return new Response(
      JSON.stringify({ error: 'Access denied: Cannot send messages to this conversation' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Insert the user/consultant message
  const { data: message, error: msgError } = await supabase
    .from('chat_messages')
    .insert({
      conversation_id: conversationId,
      content,
      role: messageRole,
      sender_type: messageRole,
      sender_id: authResult.userId,
      timestamp: new Date().toISOString(),
      metadata: {
        user_id: authResult.userId,
        user_role: authResult.userRole,
        sanitized: true
      }
    })
    .select()
    .single();

  if (msgError) {
    console.error('Error sending message:', msgError);
    return new Response(
      JSON.stringify({ error: 'Failed to send message', details: msgError.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Update conversation timestamp
  await supabase
    .from('chat_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  // Handle async routing logic for user messages
  let responseType = 'immediate';
  if (messageRole === 'user') {
    responseType = await handleUserMessageAsync(conversationId, message, authResult);
  }

  // Log message sent
  await supabase.from('audit_logs').insert({
    action: 'MESSAGE_SENT',
    description: `Message sent in conversation ${conversationId}`,
    user_id: authResult.userId,
    metadata: {
      conversation_id: conversationId,
      message_id: message.id,
      role: messageRole,
      content_length: content.length,
      response_type: responseType
    }
  });

  return new Response(
    JSON.stringify({ 
      message,
      success: true,
      response_type: responseType,
      processing_status: responseType === 'async' ? 'pending' : 'completed'
    }),
    { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Enhanced async user message handling with background processing
async function handleUserMessageAsync(conversationId: string, userMessage: any, authResult: any): Promise<string> {
  console.log('Processing user message for async routing:', { conversationId, messageId: userMessage.id });

  try {
    // Check if conversation is escalated
    const { data: escalation } = await supabase
      .from('escalations')
      .select('id, status, assigned_consultant')
      .eq('session_id', conversationId)
      .eq('status', 'active')
      .single();

    if (escalation) {
      console.log('Conversation is escalated, notifying consultant:', escalation);
      
      // Use background task for notification
      EdgeRuntime.waitUntil(
        notifyConsultantAsync(escalation, conversationId, userMessage)
      );

      return 'escalated'; // No AI processing for escalated conversations
    }

    // Create async processing queue entry
    const { data: queueEntry } = await supabase
      .from('message_processing_queue')
      .insert({
        conversation_id: conversationId,
        user_message_id: userMessage.id,
        status: 'pending'
      })
      .select()
      .single();

    if (queueEntry) {
      // Use background task for AI processing to avoid timeout
      EdgeRuntime.waitUntil(
        processAIResponseAsync(queueEntry, userMessage, authResult)
      );

      return 'async'; // AI processing started asynchronously
    }

    // Fallback to synchronous processing if queue fails
    await processAIResponseSync(conversationId, userMessage, authResult);
    return 'immediate';

  } catch (error) {
    console.error('Error in async message routing:', error);
    
    // Fallback: still try to get AI response synchronously
    try {
      await processAIResponseSync(conversationId, userMessage, authResult);
      return 'immediate';
    } catch (fallbackError) {
      console.error('Fallback AI call also failed:', fallbackError);
      return 'failed';
    }
  }
}

// Background task for consultant notification
async function notifyConsultantAsync(escalation: any, conversationId: string, userMessage: any) {
  try {
    if (escalation.assigned_consultant) {
      await supabase.functions.invoke('send-notification', {
        body: {
          user_id: escalation.assigned_consultant,
          type: 'new_message',
          title: 'New message in escalated conversation',
          message: `User sent a new message in conversation ${conversationId}`,
          metadata: {
            conversation_id: conversationId,
            escalation_id: escalation.id,
            message_preview: userMessage.content.substring(0, 100)
          }
        }
      });
    }
  } catch (error) {
    console.error('Error notifying consultant:', error);
  }
}

// Background task for AI response processing
async function processAIResponseAsync(queueEntry: any, userMessage: any, authResult: any) {
  try {
    // Update status to processing
    await supabase
      .from('message_processing_queue')
      .update({ 
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', queueEntry.id);

    // Call AI service
    const { data: aiResponse } = await supabase.functions.invoke('chat-with-ai', {
      body: {
        conversation_id: queueEntry.conversation_id,
        user_message: userMessage.content,
        user_id: authResult.userId
      }
    });

    // Update queue entry as completed
    await supabase
      .from('message_processing_queue')
      .update({ 
        status: 'completed',
        updated_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        ai_response_id: aiResponse?.message_id
      })
      .eq('id', queueEntry.id);

  } catch (error) {
    console.error('Error in async AI processing:', error);
    
    // Update queue entry as failed
    await supabase
      .from('message_processing_queue')
      .update({ 
        status: 'failed',
        error_message: error.message,
        updated_at: new Date().toISOString()
      })
      .eq('id', queueEntry.id);
  }
}

// Synchronous AI processing (fallback)
async function processAIResponseSync(conversationId: string, userMessage: any, authResult: any) {
  await supabase.functions.invoke('chat-with-ai', {
    body: {
      conversation_id: conversationId,
      user_message: userMessage.content,
      user_id: authResult.userId
    }
  });
}
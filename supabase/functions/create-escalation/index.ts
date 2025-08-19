import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { withSecurity, SecurityContext, sanitizeResponse } from '../_shared/security-hardening.ts';
import { createErrorResponse, HTTP_STATUS, ERROR_CODES } from '../_shared/error-handler.ts';
import { InputSanitizer } from '../_shared/security-utils.ts';

interface EscalationRequest {
  sessionId?: string;
  messageLog?: any[];
  reason?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  summary?: string;
  framework_tags?: string[];
  escalation_state?: string;
  contact_email?: string;
  response_type?: string;
  timezone?: string;
  language_preference?: string;
}

serve(async (req) => {
  return withSecurity(req, {
    requireAuth: true,
    rateLimitKey: 'create-escalation',
    rateLimitOptions: {
      maxAttempts: 5, // 5 escalations per hour to prevent abuse
      windowMs: 3600000 // 1 hour
    },
    validateInput: 'escalation',
    logActivity: true
  }, async (request: Request, context: SecurityContext) => {
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    console.log(`[CREATE-ESCALATION] Escalation request from user ${context.userId}`);

    // Parse and validate request body
    let escalationRequest: EscalationRequest;
    try {
      escalationRequest = await request.json();
    } catch (error) {
      return createErrorResponse(
        'Invalid JSON in request body',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT
      );
    }

    const { 
      sessionId, 
      messageLog, 
      reason, 
      priority = 'normal', 
      summary, 
      framework_tags, 
      escalation_state, 
      contact_email, 
      response_type, 
      timezone, 
      language_preference 
    } = escalationRequest;

    // Validate and sanitize inputs
    const sanitizedReason = reason ? InputSanitizer.sanitizeString(reason, 1000) : null;
    const sanitizedSummary = summary ? InputSanitizer.sanitizeString(summary, 2000) : null;
    const sanitizedContactEmail = contact_email ? InputSanitizer.sanitizeEmail(contact_email) : null;

    // Validate priority
    const validPriorities = ['low', 'normal', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      return createErrorResponse(
        'Invalid priority level',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT
      );
    }

    // Validate session ID if provided
    if (sessionId && !InputSanitizer.isValidUUID(sessionId)) {
      return createErrorResponse(
        'Invalid session ID format',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT
      );
    }

    // Sanitize framework tags
    let sanitizedFrameworkTags: string[] = [];
    if (framework_tags && Array.isArray(framework_tags)) {
      sanitizedFrameworkTags = framework_tags
        .filter(tag => typeof tag === 'string')
        .map(tag => InputSanitizer.sanitizeString(tag, 50))
        .filter(tag => tag.length > 0)
        .slice(0, 20); // Limit number of tags
    }

    // Validate message log and sanitize if present
    let sanitizedMessageLog: any[] = [];
    let chatContext = '';
    if (messageLog && Array.isArray(messageLog)) {
      sanitizedMessageLog = messageLog
        .slice(0, 50) // Limit number of messages
        .map(msg => {
          if (typeof msg === 'object' && msg.content) {
            return {
              content: InputSanitizer.sanitizeString(msg.content, 1000),
              role: msg.role || 'user',
              timestamp: msg.timestamp || new Date().toISOString()
            };
          }
          return null;
        })
        .filter(msg => msg !== null);
      
      chatContext = sanitizedMessageLog
        .map(msg => msg.content)
        .join('\n')
        .substring(0, 5000); // Limit chat context size
    } else if (sanitizedSummary) {
      chatContext = sanitizedSummary;
    }

    // Check for duplicate escalations from same user for same session
    if (sessionId) {
      const { data: existingEscalation } = await supabaseClient
        .from('escalations')
        .select('id, status')
        .eq('user_id', context.userId)
        .eq('session_id', sessionId)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingEscalation) {
        return createErrorResponse(
          'An escalation is already pending for this session',
          HTTP_STATUS.CONFLICT,
          ERROR_CODES.DUPLICATE_REQUEST
        );
      }
    }

    // Calculate SLA deadline based on priority
    const slaDeadline = calculateSLADeadline(priority);

    // Create escalation record with enhanced security and validation
    const { data: escalationData, error: escalationError } = await supabaseClient
      .from('escalations')
      .insert({
        user_id: context.userId,
        org_id: context.orgId,
        session_id: sessionId || null,
        message_log: sanitizedMessageLog.length > 0 ? sanitizedMessageLog : null,
        reason: sanitizedReason || sanitizedSummary || 'General inquiry',
        priority: priority,
        status: 'pending',
        escalation_state: escalation_state || 'submitted',
        framework_tags: sanitizedFrameworkTags,
        contact_email: sanitizedContactEmail || null,
        response_type: response_type || 'async',
        timezone: timezone || 'UTC',
        language_preference: language_preference || 'en',
        chat_context: chatContext,
        sla_deadline: slaDeadline.toISOString()
      })
      .select()
      .single();

    if (escalationError) {
      console.error("Failed to create escalation:", escalationError);
      return createErrorResponse(
        'Failed to create escalation request',
        HTTP_STATUS.INTERNAL_ERROR,
        ERROR_CODES.DATABASE_ERROR
      );
    }

    // Log escalation creation for security audit
    await supabaseClient.from('audit_logs').insert({
      action: 'ESCALATION_CREATED',
      description: `Escalation created with priority ${priority}`,
      user_id: context.userId,
      metadata: {
        escalation_id: escalationData.id,
        priority: priority,
        session_id: sessionId,
        framework_tags: sanitizedFrameworkTags,
        has_message_log: sanitizedMessageLog.length > 0,
        security_level: 'MEDIUM'
      },
      ip_address: context.ipAddress,
      user_agent: context.userAgent
    });

    console.log("Escalation created successfully:", {
      id: escalationData.id,
      userId: context.userId,
      priority: priority,
      slaDeadline: slaDeadline.toISOString()
    });

    // Notify consultants (background task)
    EdgeRuntime.waitUntil(
      notifyConsultantsAsync(supabaseClient, escalationData)
    );

    const sanitizedResponse = sanitizeResponse({
      success: true,
      escalation: {
        id: escalationData.id,
        status: escalationData.status,
        priority: escalationData.priority,
        sla_deadline: escalationData.sla_deadline,
        created_at: escalationData.created_at
      },
      message: getResponseMessage(priority),
      estimated_response_time: getEstimatedResponseTime(priority)
    }, context.userRole);

    return new Response(JSON.stringify(sanitizedResponse), {
      headers: { "Content-Type": "application/json" },
      status: HTTP_STATUS.CREATED,
    });
  });
});

// Helper functions
function calculateSLADeadline(priority: string): Date {
  const now = new Date();
  const hours = {
    urgent: 2,    // 2 hours
    high: 4,      // 4 hours
    normal: 24,   // 24 hours
    low: 72       // 72 hours
  }[priority] || 24;

  return new Date(now.getTime() + hours * 60 * 60 * 1000);
}

function getResponseMessage(priority: string): string {
  const messages = {
    urgent: "Your urgent request has been escalated. You'll hear back within 2 hours.",
    high: "Your high-priority request has been escalated. You'll hear back within 4 hours.",
    normal: "Your request has been escalated to our cybersecurity consultants. You'll hear back within 24 hours.",
    low: "Your request has been escalated. You'll hear back within 72 hours."
  };
  return messages[priority] || messages.normal;
}

function getEstimatedResponseTime(priority: string): string {
  const times = {
    urgent: "2 hours",
    high: "4 hours", 
    normal: "24 hours",
    low: "72 hours"
  };
  return times[priority] || times.normal;
}

async function notifyConsultantsAsync(supabase: any, escalation: any) {
  try {
    // Find available consultants
    const { data: consultants } = await supabase
      .from('consultant_profiles')
      .select('user_id, expertise_areas')
      .eq('is_active', true)
      .eq('availability_status', 'online');

    if (consultants && consultants.length > 0) {
      // Simple round-robin assignment for now
      const assignedConsultant = consultants[0];
      
      // Update escalation with assigned consultant
      await supabase
        .from('escalations')
        .update({ assigned_consultant: assignedConsultant.user_id })
        .eq('id', escalation.id);

      // Send notification to consultant
      await supabase.functions.invoke('send-notification', {
        body: {
          user_id: assignedConsultant.user_id,
          type: 'new_escalation',
          title: 'New Escalation Assigned',
          message: `A new ${escalation.priority} priority escalation has been assigned to you`,
          metadata: {
            escalation_id: escalation.id,
            priority: escalation.priority,
            sla_deadline: escalation.sla_deadline
          }
        }
      });
    }
  } catch (error) {
    console.error('Failed to notify consultants:', error);
  }
}
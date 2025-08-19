import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  withSecurity,
  SecurityContext,
  sanitizeResponse,
} from "../_shared/security-hardening.ts";
import {
  createErrorResponse,
  HTTP_STATUS,
  ERROR_CODES,
} from "../_shared/error-handler.ts";
import { InputSanitizer } from "../_shared/security-utils.ts";

interface ConversationEscalateRequest {
  conversationId: string;
  reason?: string;
  priority?: "low" | "normal" | "high" | "urgent";
  aiInitiated?: boolean;
}

serve(async (req) => {
  return withSecurity(
    req,
    {
      requireAuth: true,
      rateLimitKey: "conversation-escalate",
      rateLimitOptions: { maxAttempts: 10, windowMs: 60 * 1000 }, // 10 escalations per minute
      validateInput: "escalation",
      logActivity: true,
    },
    async (request: Request, context: SecurityContext) => {
      try {
        // Create Supabase client with service role
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
          { auth: { persistSession: false } },
        );

        const {
          conversationId,
          reason,
          priority = "normal",
          aiInitiated = false,
        }: ConversationEscalateRequest = await request.json();

        if (!conversationId || !InputSanitizer.isValidUUID(conversationId)) {
          return createErrorResponse(
            "Valid conversation ID is required",
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.INVALID_INPUT,
          );
        }

        // Sanitize optional reason
        const sanitizedReason = reason
          ? InputSanitizer.sanitizeString(reason, 500)
          : undefined;

        // Verify user has access to this conversation
        const { data: conversation, error: convError } = await supabase
          .from("chat_conversations")
          .select("*")
          .eq("id", conversationId)
          .eq("user_id", context.userId)
          .single();

        if (convError || !conversation) {
          return createErrorResponse(
            "Conversation not found or access denied",
            HTTP_STATUS.FORBIDDEN,
            ERROR_CODES.FORBIDDEN,
          );
        }

        // Check if already escalated (idempotent operation)
        if (conversation.status === "escalated") {
          const sanitizedResponse = sanitizeResponse(
            {
              success: true,
              message: "Conversation is already escalated",
              assignedConsultant: conversation.consultant_id,
              conversation_id: conversationId,
            },
            context.userRole,
          );

          return new Response(JSON.stringify(sanitizedResponse), {
            headers: { "Content-Type": "application/json" },
            status: HTTP_STATUS.OK,
          });
        }

        // Find available consultant
        const { data: availableConsultants, error: consultantError } =
          await supabase
            .from("consultant_profiles")
            .select(
              "user_id, id, expertise_areas, rating, total_escalations_handled",
            )
            .eq("is_active", true)
            .in("availability_status", ["online", "away"])
            .order("rating", { ascending: false })
            .order("total_escalations_handled", { ascending: true })
            .limit(5);

        if (consultantError) {
          console.error("Error finding consultants:", consultantError);
        }

        let assignedConsultantId = null;
        let waitMessage =
          "Your request has been escalated and will be reviewed by our team.";

        if (availableConsultants && availableConsultants.length > 0) {
          // Assign to best available consultant (highest rating, lowest workload)
          assignedConsultantId = availableConsultants[0].user_id;
          waitMessage =
            "You've been connected to a cybersecurity expert who will respond shortly.";
        } else {
          waitMessage =
            "All experts are currently busy. Your request has been queued and you'll receive a response within 24 hours.";
        }

        // Update conversation status
        const { error: updateError } = await supabase
          .from("chat_conversations")
          .update({
            status: "escalated",
            consultant_id: assignedConsultantId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", conversationId);

        if (updateError) {
          throw new Error(
            `Failed to update conversation: ${updateError.message}`,
          );
        }

        // Create escalation record
        const { data: escalationData, error: escalationError } = await supabase
          .from("escalations")
          .insert({
            user_id: context.userId,
            session_id: conversationId,
            assigned_consultant: assignedConsultantId,
            reason:
              sanitizedReason ||
              (aiInitiated
                ? "AI-initiated escalation"
                : "User requested human assistance"),
            priority: priority,
            status: assignedConsultantId ? "active" : "pending",
            escalation_type: aiInitiated ? "ai_initiated" : "user_initiated",
            org_id: conversation.org_id,
          })
          .select()
          .single();

        if (escalationError) {
          console.error("Failed to create escalation record:", escalationError);
        }

        // Add handoff message to conversation
        const handoffMessage = aiInitiated
          ? "I'm transferring you to a human expert who can better assist with your request."
          : waitMessage;

        const { error: messageError } = await supabase
          .from("chat_messages")
          .insert({
            conversation_id: conversationId,
            content: handoffMessage,
            role: "system",
            sender_type: "system",
            timestamp: new Date().toISOString(),
            metadata: {
              escalation_id: escalationData?.id,
              escalation_type: aiInitiated ? "ai_initiated" : "user_initiated",
            },
          });

        if (messageError) {
          console.error("Failed to add handoff message:", messageError);
        }

        // Notify assigned consultant if available
        if (assignedConsultantId) {
          try {
            await supabase.functions.invoke("send-notification", {
              body: {
                user_id: assignedConsultantId,
                type: "escalation_assigned",
                title: "New Escalation Assigned",
                message: `You've been assigned a new escalation: ${conversation.title}`,
                metadata: {
                  escalation_id: escalationData?.id,
                  conversation_id: conversationId,
                  priority: priority,
                },
              },
            });
          } catch (notificationError) {
            console.error("Failed to notify consultant:", notificationError);
          }
        }

        // Log the escalation
        await supabase.from("audit_logs").insert({
          action: "CONVERSATION_ESCALATED",
          description: `Conversation escalated ${aiInitiated ? "by AI" : "by user"}`,
          user_id: context.userId,
          metadata: {
            conversation_id: conversationId,
            escalation_id: escalationData?.id,
            assigned_consultant: assignedConsultantId,
            reason: sanitizedReason,
            ai_initiated: aiInitiated,
            security_level: "MEDIUM",
          },
          ip_address: context.ipAddress,
          user_agent: context.userAgent,
        });

        const responseData = sanitizeResponse(
          {
            success: true,
            escalation: escalationData,
            assignedConsultant: assignedConsultantId,
            message: waitMessage,
            estimatedWaitTime:
              availableConsultants?.length > 0 ? "< 30 minutes" : "< 24 hours",
            conversation_id: conversationId,
          },
          context.userRole,
        );

        return new Response(JSON.stringify(responseData), {
          headers: { "Content-Type": "application/json" },
          status: HTTP_STATUS.OK,
        });
      } catch (error) {
        console.error("Error in conversation-escalate function:", error);
        return createErrorResponse(
          "Failed to escalate conversation",
          HTTP_STATUS.INTERNAL_ERROR,
          ERROR_CODES.INTERNAL_ERROR,
        );
      }
    },
  );
});

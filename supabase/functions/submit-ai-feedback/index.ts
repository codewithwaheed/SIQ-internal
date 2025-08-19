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

interface FeedbackRequest {
  conversation_id?: string;
  message_id?: string;
  escalation_id?: string;
  feedback_type: string;
  rating?: number;
  comments?: string;
  ai_response_quality?: string;
  suggested_improvement?: string;
  category_tags?: string[];
}

serve(async (req) => {
  return withSecurity(
    req,
    {
      requireAuth: true,
      requiredRole: "consultant", // Only consultants and admins can submit feedback
      rateLimitKey: "submit-ai-feedback",
      rateLimitOptions: {
        maxAttempts: 20, // 20 feedback submissions per hour
        windowMs: 3600000, // 1 hour
      },
      validateInput: "feedback",
      logActivity: true,
    },
    async (request: Request, context: SecurityContext) => {
      // Initialize Supabase client
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } },
      );

      console.log(
        `[SUBMIT-AI-FEEDBACK] Feedback submission from consultant ${context.userId}`,
      );

      // Parse and validate request body
      let feedbackRequest: FeedbackRequest;
      try {
        feedbackRequest = await request.json();
      } catch (error) {
        return createErrorResponse(
          "Invalid JSON in request body",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INVALID_INPUT,
        );
      }

      const {
        conversation_id,
        message_id,
        escalation_id,
        feedback_type,
        rating,
        comments,
        ai_response_quality,
        suggested_improvement,
        category_tags,
      } = feedbackRequest;

      // Validate required fields
      if (!feedback_type) {
        return createErrorResponse(
          "feedback_type is required",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INVALID_INPUT,
        );
      }

      // Validate feedback_type
      const validFeedbackTypes = [
        "ai_correct",
        "ai_incorrect",
        "ai_incomplete",
        "ai_unhelpful",
        "escalation_unnecessary",
        "escalation_justified",
        "other",
      ];
      if (!validFeedbackTypes.includes(feedback_type)) {
        return createErrorResponse(
          "Invalid feedback_type",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INVALID_INPUT,
        );
      }

      // Validate rating if provided
      if (rating !== undefined && (rating < 1 || rating > 5)) {
        return createErrorResponse(
          "Rating must be between 1 and 5",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INVALID_INPUT,
        );
      }

      // Validate ai_response_quality if provided
      const validQualities = [
        "excellent",
        "good",
        "average",
        "poor",
        "very_poor",
      ];
      if (
        ai_response_quality &&
        !validQualities.includes(ai_response_quality)
      ) {
        return createErrorResponse(
          "Invalid ai_response_quality",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INVALID_INPUT,
        );
      }

      // Validate UUIDs if provided
      if (conversation_id && !InputSanitizer.isValidUUID(conversation_id)) {
        return createErrorResponse(
          "Invalid conversation_id format",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INVALID_INPUT,
        );
      }

      if (escalation_id && !InputSanitizer.isValidUUID(escalation_id)) {
        return createErrorResponse(
          "Invalid escalation_id format",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INVALID_INPUT,
        );
      }

      // Sanitize text inputs
      const sanitizedComments = comments
        ? InputSanitizer.sanitizeString(comments, 2000)
        : null;
      const sanitizedSuggestedImprovement = suggested_improvement
        ? InputSanitizer.sanitizeString(suggested_improvement, 2000)
        : null;
      const sanitizedMessageId = message_id
        ? InputSanitizer.sanitizeString(message_id, 100)
        : null;

      // Sanitize and validate category tags
      let sanitizedTags: string[] = [];
      if (category_tags && Array.isArray(category_tags)) {
        sanitizedTags = category_tags
          .filter((tag) => typeof tag === "string")
          .map((tag) => InputSanitizer.sanitizeString(tag, 50))
          .filter((tag) => tag.length > 0)
          .slice(0, 10); // Limit number of tags
      }

      // Verify consultant has access to the conversation/escalation if provided
      if (conversation_id) {
        const { data: conversation } = await supabaseClient
          .from("chat_conversations")
          .select("id, consultant_id")
          .eq("id", conversation_id)
          .single();

        if (!conversation) {
          return createErrorResponse(
            "Conversation not found",
            HTTP_STATUS.NOT_FOUND,
            ERROR_CODES.NOT_FOUND,
          );
        }

        // Check if consultant is assigned or if admin
        if (
          conversation.consultant_id !== context.userId &&
          context.userRole !== "admin"
        ) {
          return createErrorResponse(
            "Access denied to this conversation",
            HTTP_STATUS.FORBIDDEN,
            ERROR_CODES.ACCESS_DENIED,
          );
        }
      }

      if (escalation_id) {
        const { data: escalation } = await supabaseClient
          .from("escalations")
          .select("id, assigned_consultant")
          .eq("id", escalation_id)
          .single();

        if (!escalation) {
          return createErrorResponse(
            "Escalation not found",
            HTTP_STATUS.NOT_FOUND,
            ERROR_CODES.NOT_FOUND,
          );
        }

        // Check if consultant is assigned or if admin
        if (
          escalation.assigned_consultant !== context.userId &&
          context.userRole !== "admin"
        ) {
          return createErrorResponse(
            "Access denied to this escalation",
            HTTP_STATUS.FORBIDDEN,
            ERROR_CODES.ACCESS_DENIED,
          );
        }
      }

      // Create feedback record
      const { data: feedbackData, error: feedbackError } = await supabaseClient
        .from("ai_feedback")
        .insert({
          conversation_id: conversation_id || null,
          message_id: sanitizedMessageId,
          escalation_id: escalation_id || null,
          consultant_id: context.userId,
          feedback_type: feedback_type,
          rating: rating || null,
          comments: sanitizedComments,
          ai_response_quality: ai_response_quality || null,
          suggested_improvement: sanitizedSuggestedImprovement,
          category_tags: sanitizedTags,
          metadata: {
            user_agent: context.userAgent,
            ip_address: context.ipAddress,
            submitted_via: "consultant_interface",
          },
        })
        .select()
        .single();

      if (feedbackError) {
        console.error("Failed to create feedback:", feedbackError);
        return createErrorResponse(
          "Failed to submit feedback",
          HTTP_STATUS.INTERNAL_ERROR,
          ERROR_CODES.DATABASE_ERROR,
        );
      }

      // Log feedback submission for audit
      await supabaseClient.from("audit_logs").insert({
        action: "AI_FEEDBACK_SUBMITTED",
        description: `AI feedback submitted: ${feedback_type}`,
        user_id: context.userId,
        metadata: {
          feedback_id: feedbackData.id,
          feedback_type: feedback_type,
          conversation_id: conversation_id,
          escalation_id: escalation_id,
          rating: rating,
          has_comments: !!sanitizedComments,
          has_suggestions: !!sanitizedSuggestedImprovement,
          category_tags: sanitizedTags,
          security_level: "MEDIUM",
        },
        ip_address: context.ipAddress,
        user_agent: context.userAgent,
      });

      console.log("AI feedback submitted successfully:", {
        id: feedbackData.id,
        consultant: context.userId,
        type: feedback_type,
        rating: rating,
      });

      const sanitizedResponse = sanitizeResponse(
        {
          success: true,
          feedback: {
            id: feedbackData.id,
            feedback_type: feedbackData.feedback_type,
            rating: feedbackData.rating,
            created_at: feedbackData.created_at,
          },
          message:
            "Feedback submitted successfully. Thank you for helping improve our AI!",
        },
        context.userRole,
      );

      return new Response(JSON.stringify(sanitizedResponse), {
        headers: { "Content-Type": "application/json" },
        status: HTTP_STATUS.CREATED,
      });
    },
  );
});

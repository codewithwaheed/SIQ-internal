import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  authenticateRequest,
  checkRateLimit,
} from "../_shared/auth-middleware.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // Enhanced authentication - require consultant or admin role
    const authResult = await authenticateRequest(
      req,
      supabaseClient,
      "consultant",
    );
    const { userId, userRole, email, orgId } = authResult;

    console.log("Consultant authenticated:", { userId, userRole, orgId });

    // Rate limiting for consultant functions
    const rateLimitResult = await checkRateLimit(
      supabaseClient,
      userId,
      userRole,
      "consultant-functions",
    );

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded for consultant functions",
          details: {
            remainingRequests: rateLimitResult.remainingRequests,
            resetTime: rateLimitResult.resetTime.toISOString(),
          },
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "X-RateLimit-Remaining":
              rateLimitResult.remainingRequests.toString(),
            "X-RateLimit-Reset": rateLimitResult.resetTime.toISOString(),
          },
        },
      );
    }

    // Parse request body
    const { escalationId, message } = await req.json();

    if (!escalationId || !message?.trim()) {
      throw new Error("Escalation ID and message are required");
    }

    console.log(
      `[CONSULTANT-RESPOND] Consultant ${userId} responding to escalation ${escalationId}`,
    );

    // Verify consultant is assigned to this escalation
    const { data: escalation, error: escalationError } = await supabaseClient
      .from("escalations")
      .select("*")
      .eq("id", escalationId)
      .eq("assigned_consultant", userId)
      .single();

    if (escalationError) {
      throw new Error("Escalation not found or not assigned to you");
    }

    // Add consultant message to the conversation
    if (escalation.session_id) {
      const { error: messageError } = await supabaseClient
        .from("chat_messages")
        .insert({
          conversation_id: escalation.session_id,
          role: "consultant",
          content: message.trim(),
          timestamp: new Date().toISOString(),
        });

      if (messageError) {
        throw new Error(`Failed to save message: ${messageError.message}`);
      }
    }

    // Update escalation status and response count
    const { error: updateError } = await supabaseClient
      .from("escalations")
      .update({
        status: "in_progress",
        consultant_response_count: escalation.consultant_response_count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", escalationId);

    if (updateError) {
      console.error("Failed to update escalation status:", updateError);
    }

    console.log(
      `[CONSULTANT-RESPOND] Response sent successfully for escalation ${escalationId}`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: "Response sent successfully",
        escalation_id: escalationId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error in consultant-respond function:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

    // Get the authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user?.email) {
      throw new Error("User not authenticated or email not available");
    }

    // Parse request body
    const { escalationId, resolutionNotes, resolvedBy } = await req.json();

    if (!escalationId) {
      throw new Error("Escalation ID is required");
    }

    console.log(
      `[RESOLVE-ESCALATION] Resolving escalation ${escalationId} by ${resolvedBy || "user"}`,
    );

    // Determine who can resolve this escalation
    let escalation;
    if (resolvedBy === "consultant") {
      // Verify user is a consultant assigned to this escalation
      const { data: userRole, error: roleError } = await supabaseClient
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (roleError || userRole.role !== "consultant") {
        throw new Error("Access denied. Consultant role required.");
      }

      const { data: escalationData, error: escalationError } =
        await supabaseClient
          .from("escalations")
          .select("*")
          .eq("id", escalationId)
          .eq("assigned_consultant", user.id)
          .single();

      if (escalationError) {
        throw new Error("Escalation not found or not assigned to you");
      }
      escalation = escalationData;
    } else {
      // User resolving their own escalation
      const { data: escalationData, error: escalationError } =
        await supabaseClient
          .from("escalations")
          .select("*")
          .eq("id", escalationId)
          .eq("user_id", user.id)
          .single();

      if (escalationError) {
        throw new Error("Escalation not found or not yours to resolve");
      }
      escalation = escalationData;
    }

    // Update escalation status to resolved
    const { error: updateError } = await supabaseClient
      .from("escalations")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
        resolution_notes: resolutionNotes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", escalationId);

    if (updateError) {
      throw new Error(`Failed to resolve escalation: ${updateError.message}`);
    }

    // Add system message to conversation about resolution
    if (escalation.session_id) {
      const systemMessage =
        resolvedBy === "consultant"
          ? "✅ This escalation has been resolved by the consultant. You can continue chatting with our AI assistant for additional questions."
          : "✅ You have marked this escalation as resolved. Thank you for using our consultant services!";

      const { error: messageError } = await supabaseClient
        .from("chat_messages")
        .insert({
          conversation_id: escalation.session_id,
          role: "system",
          content: systemMessage,
          timestamp: new Date().toISOString(),
        });

      if (messageError) {
        console.error("Failed to add resolution message:", messageError);
      }
    }

    console.log(
      `[RESOLVE-ESCALATION] Escalation ${escalationId} resolved successfully`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: "Escalation resolved successfully",
        escalation_id: escalationId,
        resolved_by: resolvedBy || "user",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error in resolve-escalation function:", error);
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

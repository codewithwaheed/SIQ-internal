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
      throw new Error("User not authenticated");
    }

    const { replyId, escalationId } = await req.json();

    if (!replyId || !escalationId) {
      throw new Error("Reply ID and escalation ID are required");
    }

    console.log(
      `[MARK-REPLY-HELPFUL] User ${user.id} marking reply ${replyId} as helpful`,
    );

    // Record the helpful feedback
    const { error: feedbackError } = await supabaseClient
      .from("reply_feedback")
      .insert({
        reply_id: replyId,
        escalation_id: escalationId,
        user_id: user.id,
        feedback_type: "helpful",
        created_at: new Date().toISOString(),
      });

    if (feedbackError) {
      throw new Error(`Failed to record feedback: ${feedbackError.message}`);
    }

    // Update the reply's helpful count
    const { error: updateError } = await supabaseClient
      .from("consultant_replies")
      .update({
        helpful_count: supabaseClient.sql`helpful_count + 1`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", replyId);

    if (updateError) {
      console.error("Failed to update helpful count:", updateError);
      // Don't fail the request if count update fails
    }

    console.log(`[MARK-REPLY-HELPFUL] Feedback recorded successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Feedback recorded successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error in mark-reply-helpful function:", error);
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

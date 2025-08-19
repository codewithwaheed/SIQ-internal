import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ActivityEntry {
  id: string;
  timestamp: string;
  user_email: string;
  company_name: string;
  action: string;
  details: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Verify user is admin
    const authHeader = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!userRole) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Admin access required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const activities: ActivityEntry[] = [];

    // Get recent document uploads
    const { data: documents } = await supabase
      .from("documents")
      .select(
        `
        id,
        uploaded_at,
        file_name,
        user_id,
        profiles!inner(email, company_name)
      `,
      )
      .order("uploaded_at", { ascending: false })
      .limit(10);

    documents?.forEach((doc) => {
      activities.push({
        id: `doc_${doc.id}`,
        timestamp: doc.uploaded_at,
        user_email: doc.profiles.email,
        company_name: doc.profiles.company_name || "N/A",
        action: "Document Upload",
        details: `Uploaded "${doc.file_name}"`,
      });
    });

    // Get recent conversations
    const { data: conversations } = await supabase
      .from("chat_conversations")
      .select(
        `
        id,
        created_at,
        title,
        user_id,
        profiles!inner(email, company_name)
      `,
      )
      .order("created_at", { ascending: false })
      .limit(10);

    conversations?.forEach((conv) => {
      activities.push({
        id: `conv_${conv.id}`,
        timestamp: conv.created_at,
        user_email: conv.profiles.email,
        company_name: conv.profiles.company_name || "N/A",
        action: "New Chat",
        details: `Started conversation: "${conv.title}"`,
      });
    });

    // Get recent escalations
    const { data: escalations } = await supabase
      .from("escalations")
      .select(
        `
        id,
        created_at,
        reason,
        user_id,
        profiles!inner(email, company_name)
      `,
      )
      .order("created_at", { ascending: false })
      .limit(10);

    escalations?.forEach((esc) => {
      activities.push({
        id: `esc_${esc.id}`,
        timestamp: esc.created_at,
        user_email: esc.profiles.email,
        company_name: esc.profiles.company_name || "N/A",
        action: "Escalation Created",
        details: `Escalated: "${esc.reason || "Support needed"}"`,
      });
    });

    // Sort all activities by timestamp
    activities.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    // Return top 20 most recent activities
    const recentActivities = activities.slice(0, 20);

    return new Response(JSON.stringify({ activities: recentActivities }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in admin-activity function:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

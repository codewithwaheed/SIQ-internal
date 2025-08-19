import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  authenticateRequest,
  checkRateLimit,
  extractIPAddress,
} from "../_shared/auth-middleware.ts";
import { corsHeaders } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`Processing ${req.method} request for consultant assignment`);

    // Extract IP address for rate limiting
    const ipAddress = extractIPAddress(req);

    // Authenticate the request
    const authResult = await authenticateRequest(req, supabase);
    console.log("Authentication result:", {
      userId: authResult.userId,
      userRole: authResult.userRole,
      orgId: authResult.orgId,
    });

    // Strict authorization - only admin or system can assign consultants
    if (authResult.userRole !== "admin") {
      // Check if this is a system request (from another edge function)
      const systemAuth = req.headers.get("x-system-auth");
      if (!systemAuth || systemAuth !== Deno.env.get("SYSTEM_AUTH_TOKEN")) {
        console.warn("Unauthorized assignment attempt:", {
          userId: authResult.userId,
          userRole: authResult.userRole,
          ipAddress,
        });

        return new Response(
          JSON.stringify({
            error:
              "Access denied: Only administrators or system can assign consultants",
            code: "ASSIGNMENT_PERMISSION_DENIED",
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // Rate limiting - stricter for assignment operations
    const rateLimitResult = await checkRateLimit(
      supabase,
      ipAddress || authResult.userId,
      authResult.userRole,
      "consultant-assignment",
      { maxAttempts: 5, windowMs: 60 * 1000 }, // 5 assignments per minute
    );

    if (!rateLimitResult.allowed) {
      console.warn("Rate limit exceeded for assignment:", rateLimitResult);
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded for consultant assignment",
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

    const url = new URL(req.url);

    switch (req.method) {
      case "POST":
        return await handleAssignment(req, authResult);
      case "GET":
        return await getAvailableConsultants(url, authResult);
      default:
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error: any) {
    console.error("Error in consultant assignment:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

// Get available consultants for assignment (with fallback handling)
async function getAvailableConsultants(url: URL, authResult: any) {
  const expertiseFilter = url.searchParams.get("expertise")?.split(",") || null;
  const urgency = url.searchParams.get("urgency") || "normal";
  const timezone = url.searchParams.get("timezone") || "UTC";

  console.log("Finding available consultants:", {
    expertiseFilter,
    urgency,
    timezone,
  });

  // Call the database function to get available consultants
  const { data: consultants, error } = await supabase.rpc(
    "get_available_consultants",
    {
      expertise_filter: expertiseFilter,
      limit_val: 10,
    },
  );

  if (error) {
    console.error("Error getting available consultants:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to get available consultants",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Handle no consultants available
  if (!consultants || consultants.length === 0) {
    console.warn("No consultants available for assignment:", {
      expertiseFilter,
      urgency,
    });

    // Log for admin notification
    await supabase.from("audit_logs").insert({
      action: "NO_CONSULTANTS_AVAILABLE",
      description: `No consultants available for assignment - expertise: ${expertiseFilter?.join(", ") || "any"}, urgency: ${urgency}`,
      user_id: authResult.userId,
      metadata: {
        expertise_filter: expertiseFilter,
        urgency,
        timezone,
        timestamp: new Date().toISOString(),
        requires_escalation: true,
      },
    });

    return new Response(
      JSON.stringify({
        consultants: [],
        fallback_strategy: "queue_request",
        message: "No consultants currently available. Request will be queued.",
        notification_sent: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({
      consultants,
      available_count: consultants.length,
      strategy: "immediate_assignment",
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

// Handle consultant assignment
async function handleAssignment(req: Request, authResult: any) {
  const body = await req.json();
  const { escalation_id, consultant_id, force_assign = false } = body;

  if (!escalation_id || !consultant_id) {
    return new Response(
      JSON.stringify({ error: "escalation_id and consultant_id are required" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Verify consultant is available (unless force assign)
  if (!force_assign) {
    const { data: consultant } = await supabase
      .from("consultant_profiles")
      .select("availability_status, is_active, is_verified")
      .eq("id", consultant_id)
      .single();

    if (!consultant || !consultant.is_active || !consultant.is_verified) {
      return new Response(
        JSON.stringify({ error: "Consultant not available for assignment" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (consultant.availability_status === "offline") {
      return new Response(
        JSON.stringify({
          error: "Consultant is currently offline",
          suggestion:
            "Use force_assign=true to override, or select another consultant",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  }

  // Assign consultant to escalation
  const { data, error } = await supabase
    .from("escalations")
    .update({
      assigned_consultant: consultant_id,
      escalation_state: "assigned",
      updated_at: new Date().toISOString(),
    })
    .eq("id", escalation_id)
    .select()
    .single();

  if (error) {
    console.error("Error assigning consultant:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to assign consultant",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Log the assignment
  await supabase.from("audit_logs").insert({
    action: "CONSULTANT_ASSIGNED",
    description: `Consultant assigned to escalation`,
    user_id: authResult.userId,
    metadata: {
      escalation_id,
      consultant_id,
      force_assign,
      assigned_by: authResult.userId,
      timestamp: new Date().toISOString(),
    },
  });

  return new Response(
    JSON.stringify({
      success: true,
      escalation: data,
      message: "Consultant assigned successfully",
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

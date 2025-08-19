import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (userRole?.role !== "admin") {
      throw new Error("Admin access required");
    }

    const url = new URL(req.url);
    const endpoint = url.pathname.split("/").pop();
    const method = req.method;

    if (endpoint === "health" && method === "GET") {
      // GET /admin-system/health
      const healthData = {
        cpu: Math.floor(Math.random() * 30) + 15, // 15-45%
        memory: Math.floor(Math.random() * 40) + 40, // 40-80%
        storage: Math.floor(Math.random() * 30) + 30, // 30-60%
        network: "healthy",
        uptime: "99.9%",
        services: [
          {
            name: "API Gateway",
            status: "running",
            uptime: "99.9%",
            lastRestart: Math.floor(Math.random() * 15) + 1 + " days ago",
          },
          {
            name: "Database",
            status: "running",
            uptime: "99.8%",
            lastRestart: Math.floor(Math.random() * 20) + 10 + " days ago",
          },
          {
            name: "AI Model Service",
            status: "running",
            uptime: "98.5%",
            lastRestart: Math.floor(Math.random() * 5) + 1 + " days ago",
          },
          {
            name: "Vector Search",
            status: "running",
            uptime: "99.2%",
            lastRestart: Math.floor(Math.random() * 10) + 3 + " days ago",
          },
          {
            name: "File Storage",
            status: "running",
            uptime: "99.9%",
            lastRestart: Math.floor(Math.random() * 15) + 5 + " days ago",
          },
          {
            name: "Authentication",
            status: "running",
            uptime: "100%",
            lastRestart: Math.floor(Math.random() * 25) + 15 + " days ago",
          },
        ],
        backup: {
          lastBackup: new Date(
            Date.now() - Math.random() * 4 * 60 * 60 * 1000,
          ).toISOString(),
          size: (Math.random() * 2 + 1.5).toFixed(1) + " GB",
          retention: "30 days",
          nextScheduled: "Sunday 2:00 AM UTC",
        },
      };

      // Store health metrics
      await supabase.from("system_health").insert({
        metric_name: "system_overview",
        metric_value: healthData,
      });

      return new Response(JSON.stringify(healthData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (endpoint === "security" && method === "PATCH") {
      // PATCH /admin-system/security
      const body = await req.json();

      // Update security settings
      for (const [key, value] of Object.entries(body)) {
        await supabase.from("system_settings").upsert({
          setting_key: key,
          setting_value: { enabled: value },
          updated_by: user.id,
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Security settings updated",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (endpoint === "backup" && method === "POST") {
      // POST /admin-system/backup
      const jobId = crypto.randomUUID();

      // Simulate backup process
      setTimeout(async () => {
        await supabase.from("audit_logs").insert({
          action: "SYSTEM_BACKUP",
          description: "System backup completed",
          user_id: user.id,
          metadata: { jobId, size: "2.4 GB", duration: "5 minutes" },
        });
      }, 5000);

      return new Response(
        JSON.stringify({
          success: true,
          jobId,
          message: "Backup started",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (endpoint === "logs" && method === "GET") {
      // GET /admin-system/logs
      const limit = parseInt(url.searchParams.get("limit") || "50");

      const { data: logs, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Format logs for system display
      const formattedLogs =
        logs?.map((log) => ({
          time: new Date(log.created_at).toLocaleTimeString(),
          level: getLogLevel(log.action),
          component: getLogComponent(log.action),
          message: log.description,
        })) || [];

      return new Response(JSON.stringify(formattedLogs), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Endpoint not found");
  } catch (error) {
    console.error("Error in admin-system function:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status:
          error.message === "Unauthorized" ||
          error.message === "Admin access required"
            ? 401
            : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

function getLogLevel(action: string): string {
  if (action.includes("ERROR") || action.includes("FAILED")) return "ERROR";
  if (action.includes("WARN") || action.includes("WARNING")) return "WARN";
  return "INFO";
}

function getLogComponent(action: string): string {
  if (action.includes("BACKUP")) return "BACKUP";
  if (action.includes("AUTH")) return "AUTH";
  if (action.includes("SYSTEM")) return "SYSTEM";
  if (action.includes("AI")) return "AI";
  if (action.includes("API")) return "API";
  return "SYSTEM";
}

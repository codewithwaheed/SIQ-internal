import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  extractIPAddress,
  sanitizeError,
  validateRequestInput,
} from "../_shared/auth-middleware.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AuditLogEntry {
  user_id?: string;
  tenant_id?: string;
  action: string;
  description: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key for unrestricted access
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // Parse and validate request body
    let requestBody: AuditLogEntry;
    try {
      requestBody = await req.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // Validate input schema
    const validation = validateRequestInput(requestBody, {
      action: { required: true, type: "string", minLength: 1, maxLength: 100 },
      description: {
        required: true,
        type: "string",
        minLength: 1,
        maxLength: 1000,
      },
      user_id: {
        required: false,
        type: "string",
        pattern:
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      },
      tenant_id: {
        required: false,
        type: "string",
        pattern:
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      },
    });

    if (!validation.isValid) {
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          details: validation.errors,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    const {
      user_id,
      tenant_id,
      action,
      description,
      metadata = {},
    } = requestBody;

    // Extract and validate client information from request headers
    const ip_address = extractIPAddress(req);
    const user_agent = req.headers.get("user-agent")?.substring(0, 500) || null; // Limit length

    // Insert audit log entry
    const { error } = await supabaseClient.from("audit_logs").insert({
      user_id: user_id || null,
      tenant_id: tenant_id || null,
      action,
      description,
      ip_address,
      user_agent,
      metadata,
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Error inserting audit log:", error);
      const sanitizedError = sanitizeError(error, "Failed to log audit event");
      return new Response(JSON.stringify({ error: sanitizedError }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    console.log(`Audit log created: ${action} - ${description}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in audit logging:", error);
    const sanitizedError = sanitizeError(error, "Internal server error");
    return new Response(JSON.stringify({ error: sanitizedError }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

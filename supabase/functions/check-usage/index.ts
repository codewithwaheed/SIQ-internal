import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-USAGE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError) {
      throw new Error(`Authentication error: ${userError.message}`);
    }

    const user = userData.user;
    if (!user?.email) {
      throw new Error("User not authenticated or email not available");
    }

    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get subscription and usage data
    const { data: subscriber, error: subscriberError } = await supabaseClient
      .from("subscribers")
      .select(`
        subscribed,
        subscription_tier,
        subscription_end,
        monthly_uploads_used,
        monthly_escalations_used,
        billing_cycle_start
      `)
      .eq("email", user.email)
      .single();

    if (subscriberError && subscriberError.code !== 'PGRST116') {
      throw subscriberError;
    }

    // Default to Basic tier if no subscription found
    const subscriptionData = subscriber || {
      subscribed: false,
      subscription_tier: "Basic",
      subscription_end: null,
      monthly_uploads_used: 0,
      monthly_escalations_used: 0,
      billing_cycle_start: new Date().toISOString()
    };

    // Get tier limits
    const { data: limits, error: limitsError } = await supabaseClient
      .rpc("get_tier_limits", { tier_name: subscriptionData.subscription_tier });

    if (limitsError) {
      throw limitsError;
    }

    const tierLimits = limits[0] || { upload_limit: 0, escalation_limit: 0 };

    // Calculate remaining usage
    const uploadsRemaining = tierLimits.upload_limit === -1 
      ? -1 // unlimited
      : Math.max(0, tierLimits.upload_limit - subscriptionData.monthly_uploads_used);

    const escalationsRemaining = tierLimits.escalation_limit === -1
      ? -1 // unlimited
      : Math.max(0, tierLimits.escalation_limit - subscriptionData.monthly_escalations_used);

    // Check if user can perform actions
    const { data: canUpload } = await supabaseClient
      .rpc("can_user_perform_action", { 
        user_email: user.email, 
        action_type: "upload" 
      });

    const { data: canEscalate } = await supabaseClient
      .rpc("can_user_perform_action", { 
        user_email: user.email, 
        action_type: "escalation" 
      });

    const response = {
      subscription: {
        subscribed: subscriptionData.subscribed,
        tier: subscriptionData.subscription_tier,
        subscription_end: subscriptionData.subscription_end,
        billing_cycle_start: subscriptionData.billing_cycle_start
      },
      usage: {
        uploads: {
          used: subscriptionData.monthly_uploads_used,
          limit: tierLimits.upload_limit,
          remaining: uploadsRemaining,
          can_upload: canUpload
        },
        escalations: {
          used: subscriptionData.monthly_escalations_used,
          limit: tierLimits.escalation_limit,
          remaining: escalationsRemaining,
          can_escalate: canEscalate
        }
      },
      tier_features: {
        basic: {
          ai_chat: true,
          document_upload: false,
          consultant_escalation: false
        },
        pro: {
          ai_chat: true,
          document_upload: true,
          upload_limit: 5,
          consultant_escalation: false
        },
        premium: {
          ai_chat: true,
          document_upload: true,
          upload_limit: -1, // unlimited
          consultant_escalation: true,
          escalation_limit: 2
        }
      }
    };

    logStep("Usage data retrieved successfully", { 
      tier: subscriptionData.subscription_tier,
      uploadsUsed: subscriptionData.monthly_uploads_used,
      escalationsUsed: subscriptionData.monthly_escalations_used
    });

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-usage", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
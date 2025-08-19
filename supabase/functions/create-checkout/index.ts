import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  authenticateRequest,
  auditSecurityEvent,
  sanitizeError,
} from "../_shared/auth-middleware.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Helper logging function for enhanced debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Create a Supabase client using the anon key for user authentication
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    // Use secure authentication middleware
    const authData = await authenticateRequest(req, supabaseClient);
    logStep("User authenticated", {
      userId: authData.userId,
      email: authData.email,
    });

    // Audit security event
    await auditSecurityEvent(
      supabaseClient,
      authData.userId,
      "CHECKOUT_INITIATED",
      "User initiated checkout session",
      { action: "create_checkout" },
      req.headers.get("x-forwarded-for") || "unknown",
      req.headers.get("user-agent"),
    );

    const { priceId } = await req.json();
    if (!priceId) throw new Error("priceId is required");
    logStep("Request body parsed", { priceId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check if a Stripe customer record exists for this user
    const customers = await stripe.customers.list({
      email: authData.email,
      limit: 1,
    });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing Stripe customer", { customerId });
    } else {
      logStep("No existing customer found, will create during checkout");
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";
    logStep("Creating checkout session", { origin, priceId, customerId });

    // Create a subscription checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : authData.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard/billing?canceled=true`,
      allow_promotion_codes: true,
      billing_address_collection: "required",
      metadata: {
        user_id: authData.userId,
        user_email: authData.email,
      },
    });

    logStep("Checkout session created successfully", {
      sessionId: session.id,
      url: session.url,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = sanitizeError(
      error,
      "Failed to create checkout session",
    );
    logStep("ERROR in create-checkout", { message: errorMessage });

    // Audit security event for failed checkout
    try {
      await auditSecurityEvent(
        supabaseClient,
        null, // No user ID available on error
        "CHECKOUT_FAILED",
        "Checkout session creation failed",
        { error: errorMessage },
        req.headers.get("x-forwarded-for") || "unknown",
        req.headers.get("user-agent"),
      );
    } catch (auditError) {
      console.error("Failed to audit checkout error:", auditError);
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

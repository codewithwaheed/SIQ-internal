import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
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

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!stripeKey) {
    console.error("STRIPE_SECRET_KEY not found");
    return new Response("Server configuration error", { status: 500 });
  }

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not found");
    return new Response("Server configuration error", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

  // Initialize Supabase client with service role key
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    const startTime = Date.now();

    if (!signature) {
      console.error("No Stripe signature found");
      return new Response("No signature", {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Enhanced webhook signature verification with timestamp check
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

      // Verify timestamp to prevent replay attacks (5 minute tolerance)
      const webhookTimestamp = parseInt(
        signature.split("t=")[1]?.split(",")[0] || "0",
      );
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const maxAge = 300; // 5 minutes

      if (Math.abs(currentTimestamp - webhookTimestamp) > maxAge) {
        console.error("Webhook timestamp too old:", {
          webhookTimestamp,
          currentTimestamp,
        });
        return new Response("Webhook too old", {
          status: 400,
          headers: corsHeaders,
        });
      }
    } catch (err) {
      console.error("Invalid signature or timestamp:", err);
      return new Response("Invalid signature", {
        status: 400,
        headers: corsHeaders,
      });
    }

    console.log(
      `Processing Stripe event: ${event.type} (received in ${Date.now() - startTime}ms)`,
    );

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionChange(
          event.data.object as Stripe.Subscription,
          supabaseClient,
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionCancellation(
          event.data.object as Stripe.Subscription,
          supabaseClient,
        );
        break;

      case "invoice.payment_succeeded":
        await handleSuccessfulPayment(
          event.data.object as Stripe.Invoice,
          supabaseClient,
        );
        break;

      case "invoice.payment_failed":
        await handleFailedPayment(
          event.data.object as Stripe.Invoice,
          supabaseClient,
        );
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function handleSubscriptionChange(
  subscription: Stripe.Subscription,
  supabaseClient: any,
) {
  console.log(`Handling subscription change: ${subscription.id}`);

  try {
    // Get customer details
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });
    const customer = (await stripe.customers.retrieve(
      subscription.customer as string,
    )) as Stripe.Customer;

    if (!customer.email) {
      console.error("No email found for customer");
      return;
    }

    // Get price details to determine tier
    const priceId = subscription.items.data[0].price.id;
    const price = await stripe.prices.retrieve(priceId);
    const amount = price.unit_amount || 0;

    let subscriptionTier = "Basic";
    if (amount === 4900) {
      // $49
      subscriptionTier = "Pro";
    } else if (amount === 14900) {
      // $149
      subscriptionTier = "Premium";
    }

    // Update subscriber record
    const { error } = await supabaseClient.from("subscribers").upsert(
      {
        email: customer.email,
        stripe_customer_id: customer.id,
        stripe_subscription_id: subscription.id,
        price_id: priceId,
        subscribed: subscription.status === "active",
        subscription_tier: subscriptionTier,
        subscription_end: new Date(
          subscription.current_period_end * 1000,
        ).toISOString(),
        monthly_uploads_used: 0, // Reset usage on subscription change
        monthly_escalations_used: 0,
        billing_cycle_start: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "email",
        ignoreDuplicates: false,
      },
    );

    if (error) {
      console.error("Error updating subscriber:", error);
    } else {
      console.log(
        `Updated subscription for ${customer.email} to ${subscriptionTier}`,
      );

      // Log subscription change
      await supabaseClient.from("audit_logs").insert({
        action: "SUBSCRIPTION_UPDATED",
        description: `Subscription updated for ${customer.email} to ${subscriptionTier} tier`,
        metadata: {
          customer_email: customer.email,
          subscription_tier: subscriptionTier,
          subscription_id: subscription.id,
          price_id: priceId,
          status: subscription.status,
        },
      });
    }
  } catch (error) {
    console.error("Error in handleSubscriptionChange:", error);
  }
}

async function handleSubscriptionCancellation(
  subscription: Stripe.Subscription,
  supabaseClient: any,
) {
  console.log(`Handling subscription cancellation: ${subscription.id}`);

  try {
    const { error } = await supabaseClient
      .from("subscribers")
      .update({
        subscribed: false,
        subscription_tier: "Basic",
        subscription_end: null,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", subscription.id);

    if (error) {
      console.error("Error updating cancelled subscription:", error);
    } else {
      console.log(`Cancelled subscription: ${subscription.id}`);

      // Log subscription cancellation
      await supabaseClient.from("audit_logs").insert({
        action: "SUBSCRIPTION_CANCELLED",
        description: `Subscription cancelled for subscription ID: ${subscription.id}`,
        metadata: {
          subscription_id: subscription.id,
          status: "cancelled",
        },
      });
    }
  } catch (error) {
    console.error("Error in handleSubscriptionCancellation:", error);
  }
}

async function handleSuccessfulPayment(
  invoice: Stripe.Invoice,
  supabaseClient: any,
) {
  console.log(`Handling successful payment: ${invoice.id}`);

  try {
    if (invoice.subscription) {
      // Reset monthly usage on successful payment
      const { error } = await supabaseClient
        .from("subscribers")
        .update({
          monthly_uploads_used: 0,
          monthly_escalations_used: 0,
          billing_cycle_start: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", invoice.subscription);

      if (error) {
        console.error("Error resetting usage after payment:", error);
      } else {
        console.log(`Reset usage for subscription: ${invoice.subscription}`);
      }
    }
  } catch (error) {
    console.error("Error in handleSuccessfulPayment:", error);
  }
}

async function handleFailedPayment(
  invoice: Stripe.Invoice,
  supabaseClient: any,
) {
  console.log(`Handling failed payment: ${invoice.id}`);
  // TODO: Implement failed payment handling
  // - Mark subscription as past_due
  // - Send notification to user
  // - Potentially disable premium features
}

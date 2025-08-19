import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { authenticateRequest } from "../_shared/auth-middleware.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper logging function
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RATE-MESSAGE] ${step}${detailsStr}`);
};

interface RatingRequest {
  messageId: string;
  conversationId: string;
  ratingType: 'positive' | 'negative';
  feedbackText?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  logStep("Rating request started");

  // Create Supabase client
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Authenticate user
    const authResult = await authenticateRequest(req, supabaseClient);
    if (!authResult.user) {
      throw new Error('Authentication required');
    }

    logStep("User authenticated", { userId: authResult.user.id });

    // Parse request body
    const body: RatingRequest = await req.json();
    const { messageId, conversationId, ratingType, feedbackText } = body;

    logStep("Request parsed", { messageId, conversationId, ratingType, hasFeedback: !!feedbackText });

    // Validate input
    if (!messageId || !conversationId || !ratingType) {
      throw new Error('Missing required fields: messageId, conversationId, ratingType');
    }

    if (!['positive', 'negative'].includes(ratingType)) {
      throw new Error('Invalid rating type. Must be "positive" or "negative"');
    }

    // Get user's subscription tier for metadata
    const { data: subscriberData } = await supabaseClient
      .from('subscribers')
      .select('subscription_tier')
      .eq('user_id', authResult.user.id)
      .single();

    const subscriptionTier = subscriberData?.subscription_tier || 'Basic';

    logStep("Retrieved subscription tier", { subscriptionTier });

    // Check if user has already rated this message
    const { data: existingRating } = await supabaseClient
      .from('message_ratings')
      .select('id, rating_type')
      .eq('message_id', messageId)
      .eq('user_id', authResult.user.id)
      .maybeSingle();

    if (existingRating) {
      // Update existing rating
      const { data: updatedRating, error: updateError } = await supabaseClient
        .from('message_ratings')
        .update({
          rating_type: ratingType,
          feedback_text: feedbackText || null,
          subscription_tier: subscriptionTier,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingRating.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update rating: ${updateError.message}`);
      }

      logStep("Rating updated", { ratingId: updatedRating.id });

      return new Response(JSON.stringify({
        success: true,
        rating: updatedRating,
        message: 'Rating updated successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    } else {
      // Create new rating
      const { data: newRating, error: insertError } = await supabaseClient
        .from('message_ratings')
        .insert({
          message_id: messageId,
          conversation_id: conversationId,
          user_id: authResult.user.id,
          rating_type: ratingType,
          feedback_text: feedbackText || null,
          subscription_tier: subscriptionTier
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to create rating: ${insertError.message}`);
      }

      logStep("New rating created", { ratingId: newRating.id });

      return new Response(JSON.stringify({
        success: true,
        rating: newRating,
        message: 'Rating submitted successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      });
    }

  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in rate-message", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
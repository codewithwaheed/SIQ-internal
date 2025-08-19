import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { securityHeaders } from "../_shared/security-utils.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  ...securityHeaders
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[UPDATE-TITLE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Update title request started");

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate user
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
    if (!user) {
      throw new Error("User not authenticated");
    }

    logStep("User authenticated", { userId: user.id });

    // Parse request body
    const { conversationId, title, tags } = await req.json();

    if (!conversationId || !title) {
      throw new Error("Conversation ID and title are required");
    }

    // Validate title length
    if (title.length > 100) {
      throw new Error("Title must be 100 characters or less");
    }

    logStep("Request parsed", { conversationId, title, tags });

    // Verify user owns this conversation
    const { data: conversation, error: convError } = await supabaseClient
      .from('chat_conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (convError) {
      throw new Error(`Failed to retrieve conversation: ${convError.message}`);
    }

    logStep("Conversation verified", { currentTitle: conversation.title });

    // Prepare update data
    const updateData: any = {
      title: title.trim(),
      updated_at: new Date().toISOString()
    };

    // Include tags if provided
    if (tags && Array.isArray(tags)) {
      updateData.tags = tags;
    }

    // Update conversation
    const { error: updateError } = await supabaseClient
      .from('chat_conversations')
      .update(updateData)
      .eq('id', conversationId);

    if (updateError) {
      throw new Error(`Failed to update conversation: ${updateError.message}`);
    }

    logStep("Conversation updated successfully");

    return new Response(JSON.stringify({
      success: true,
      title: updateData.title,
      tags: updateData.tags || conversation.tags
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in update-chat-title", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
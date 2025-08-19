// Supabase Edge Function for Security Guard
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GuardRequest {
  message: string;
  userId?: string;
  context?: string;
}

const REFUSAL_MESSAGE = "I'm sorry, but I can't share that. However, I'm happy to help you with cybersecurity compliance questions.";
const REDIRECT_MESSAGE = "Let's move on to compliance topics I can help with.";

// Security patterns (same as in the frontend guard)
const BLOCK_PATTERNS = [
  /admin\s+password/i,
  /root\s+password/i,
  /api\s+key/i,
  /secret\s+key/i,
  /source\s+code/i,
  /model\s+architecture/i,
  /training\s+data/i,
  /where\s+do\s+you\s+get\s+your\s+data/i,
  /who\s+made\s+you/i,
  /internal\s+(docs?|logs?|database|schema)/i,
  /s3\s+bucket/i,
  /(full|entire|complete)\s+(database|knowledge\s*base|kb|log|chat\s*history)/i,
  /(dump|export|download)\s+(all|everything|raw|unfiltered)/i,
  /select\s+\*\s+from/i,
  /union\s+all.*select/i,
];

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Get user role
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const { message, userId, context }: GuardRequest = await req.json();

    // Admins bypass all guards
    if (userRole?.role === 'admin') {
      return new Response(JSON.stringify({
        blocked: false,
        message: null,
        userRole: userRole.role
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if message contains blocked patterns
    const isBlocked = BLOCK_PATTERNS.some(pattern => pattern.test(message));
    
    if (!isBlocked) {
      return new Response(JSON.stringify({
        blocked: false,
        message: null,
        userRole: userRole?.role || 'user'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check attempt count from database
    const { data: attempts } = await supabase
      .from('security_events')
      .select('id')
      .eq('user_id', user.id)
      .eq('event_type', 'DATA_REQUEST_BLOCKED')
      .gte('created_at', new Date(Date.now() - 3600000).toISOString()) // Last hour
      .order('created_at', { ascending: false });

    const attemptCount = (attempts?.length || 0) + 1;

    // Log this security event
    await supabase
      .from('security_events')
      .insert({
        user_id: user.id,
        event_type: 'DATA_REQUEST_BLOCKED',
        severity: 'MEDIUM',
        description: 'User attempted to access restricted information',
        metadata: {
          blocked_message: message,
          attempt_count: attemptCount,
          context: context || 'chat',
          patterns_matched: BLOCK_PATTERNS.filter(p => p.test(message)).map(p => p.source)
        }
      });

    // Determine response based on attempt count
    const responseMessage = attemptCount >= 3 ? REDIRECT_MESSAGE : REFUSAL_MESSAGE;
    const shouldRedirect = attemptCount >= 3;

    return new Response(JSON.stringify({
      blocked: true,
      message: responseMessage,
      shouldRedirect,
      attemptCount,
      userRole: userRole?.role || 'user'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in security-guard function:', error);
    
    return new Response(JSON.stringify({
      error: error.message,
      blocked: true,
      message: 'An error occurred while processing your request.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced routing criteria weights
const ROUTING_WEIGHTS = {
  framework_match: 30,
  industry_match: 20,
  timezone_match: 15,
  clearance_match: 15,
  language_match: 10,
  historical_relationship: 25,
  response_time: 15,
  current_load: 20,
  satisfaction_rating: 10,
};

interface RoutingInputs {
  framework_tags: string[];
  industry_context?: string;
  urgency: string;
  timezone?: string;
  language_preference?: string;
  clearance_requirement?: string;
  user_id: string;
}

interface ConsultantScore {
  consultant: any;
  score: number;
  breakdown: Record<string, number>;
}

const logStep = (step: string, details?: any) => {
  console.log(`[ENHANCED-ROUTING] ${step}`, details ? JSON.stringify(details) : '');
};

// Calculate consultant score based on routing criteria
function calculateConsultantScore(consultant: any, inputs: RoutingInputs): ConsultantScore {
  const breakdown: Record<string, number> = {};
  let totalScore = 0;

  // Framework expertise match
  const frameworkMatches = inputs.framework_tags.filter(
    (tag) =>
      consultant.primary_frameworks?.includes(tag) || consultant.expertise_areas?.includes(tag),
  ).length;
  const frameworkScore =
    Math.min(frameworkMatches / Math.max(inputs.framework_tags.length, 1), 1) *
    ROUTING_WEIGHTS.framework_match;
  breakdown.framework_match = frameworkScore;
  totalScore += frameworkScore;

  // Industry experience match
  const industryScore =
    inputs.industry_context && consultant.industry_experience?.includes(inputs.industry_context)
      ? ROUTING_WEIGHTS.industry_match
      : 0;
  breakdown.industry_match = industryScore;
  totalScore += industryScore;

  // Timezone proximity (same timezone gets full points, adjacent gets partial)
  const timezoneScore =
    inputs.timezone === consultant.timezone
      ? ROUTING_WEIGHTS.timezone_match
      : inputs.timezone && consultant.timezone
        ? ROUTING_WEIGHTS.timezone_match * 0.5
        : 0;
  breakdown.timezone_match = timezoneScore;
  totalScore += timezoneScore;

  // Security clearance match
  const clearanceScore =
    inputs.clearance_requirement &&
    consultant.clearance_level &&
    consultant.clearance_level >= inputs.clearance_requirement
      ? ROUTING_WEIGHTS.clearance_match
      : 0;
  breakdown.clearance_match = clearanceScore;
  totalScore += clearanceScore;

  // Language match
  const languageScore = consultant.languages?.includes(inputs.language_preference || 'en')
    ? ROUTING_WEIGHTS.language_match
    : 0;
  breakdown.language_match = languageScore;
  totalScore += languageScore;

  // Response time (faster response gets higher score)
  const avgResponseTime = consultant.response_time_avg || 180; // default 3 hours
  const responseScore = Math.max(0, (240 - avgResponseTime) / 240) * ROUTING_WEIGHTS.response_time;
  breakdown.response_time = responseScore;
  totalScore += responseScore;

  // Current workload (lower load gets higher score)
  const currentLoad = consultant.current_escalations || 0;
  const maxLoad = consultant.max_concurrent_escalations || 3;
  const loadScore = Math.max(0, (maxLoad - currentLoad) / maxLoad) * ROUTING_WEIGHTS.current_load;
  breakdown.current_load = loadScore;
  totalScore += loadScore;

  // Satisfaction rating
  const satisfactionScore =
    ((consultant.satisfaction_rating || 4.0) / 5.0) * ROUTING_WEIGHTS.satisfaction_rating;
  breakdown.satisfaction_rating = satisfactionScore;
  totalScore += satisfactionScore;

  return { consultant, score: totalScore, breakdown };
}

// Check for historical relationships
async function getHistoricalScore(
  supabase: any,
  consultantId: string,
  userId: string,
): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('escalations')
      .select('id, first_response_at, resolved_at')
      .eq('assigned_consultant', consultantId)
      .eq('user_id', userId)
      .eq('escalation_state', 'resolved');

    if (error || !data?.length) return 0;

    // Bonus for successful past interactions
    const successfulInteractions = data.filter((e) => e.resolved_at).length;
    return Math.min(successfulInteractions * 5, ROUTING_WEIGHTS.historical_relationship);
  } catch (error) {
    logStep('Error calculating historical score', { error: error.message });
    return 0;
  }
}

// Generate context pack for escalation
async function generateContextPack(
  supabase: any,
  messages: any[],
  userProfile: any,
  escalationData: any,
): Promise<any> {
  const contextPack = {
    messages: messages.slice(-25), // Last 25 messages
    user_profile: {
      company: userProfile.company_name,
      industry: userProfile.industry_experience?.[0],
      timezone: userProfile.timezone,
    },
    detected_entities: [],
    framework_tags: escalationData.framework_tags || [],
    risk_flags: escalationData.risk_flags || [],
    environment_notes: escalationData.environment_notes,
    ai_summary: generateAISummary(messages, escalationData),
    files: [], // Will be populated with file references
    redactable_items: ['user_profile', 'messages', 'environment_notes'],
    created_at: new Date().toISOString(),
    version: '1.0',
  };

  // Detect entities from messages
  const allText = messages
    .map((m) => m.content)
    .join(' ')
    .toLowerCase();
  const entities = extractEntities(allText);
  contextPack.detected_entities = entities;

  return contextPack;
}

// Simple entity extraction
function extractEntities(text: string): string[] {
  const patterns = {
    frameworks: ['nist', 'sox', 'iso27001', 'cmmc', 'fedramp', 'gdpr', 'hipaa'],
    technologies: ['aws', 'azure', 'kubernetes', 'docker', 'terraform'],
    threats: ['malware', 'phishing', 'ransomware', 'breach', 'vulnerability'],
  };

  const entities: string[] = [];
  Object.entries(patterns).forEach(([category, keywords]) => {
    keywords.forEach((keyword) => {
      if (text.includes(keyword)) {
        entities.push(`${category}:${keyword}`);
      }
    });
  });

  return entities;
}

// Generate AI summary
function generateAISummary(messages: any[], escalationData: any): string {
  const recentMessages = messages.slice(-10);
  const userMessages = recentMessages.filter((m) => m.role === 'user');
  const primaryConcern =
    userMessages[userMessages.length - 1]?.content?.substring(0, 200) ||
    'General cybersecurity inquiry';

  return `User requesting assistance with ${escalationData.framework_tags?.join(', ') || 'cybersecurity'} related to: ${primaryConcern}. Urgency: ${escalationData.urgency}.`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Enhanced routing request started');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data } = await supabase.auth.getUser(token);
    const user = data.user;

    if (!user?.email) {
      throw new Error('User not authenticated');
    }

    const { escalationId, routingInputs, messages } = await req.json();
    logStep('Processing routing', { escalationId, inputs: routingInputs });

    // Get user profile for additional context
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Get available consultants with enhanced profiles
    const { data: consultants, error: consultantsError } = await supabase
      .from('profiles')
      .select(
        `
        *,
        user_roles!inner(role)
      `,
      )
      .eq('user_roles.role', 'consultant')
      .eq('availability_status', 'available')
      .lt('current_escalations', 'max_concurrent_escalations');

    if (consultantsError || !consultants?.length) {
      logStep('No available consultants', { error: consultantsError });
      throw new Error('No consultants are currently available within SLA window');
    }

    // Score each consultant
    const scoredConsultants: ConsultantScore[] = [];

    for (const consultant of consultants) {
      const baseScore = calculateConsultantScore(consultant, routingInputs);
      const historicalScore = await getHistoricalScore(supabase, consultant.user_id, user.id);

      baseScore.score += historicalScore;
      baseScore.breakdown.historical_relationship = historicalScore;

      scoredConsultants.push(baseScore);
    }

    // Sort by score (highest first) and use deterministic tiebreaker
    scoredConsultants.sort((a, b) => {
      if (Math.abs(a.score - b.score) < 0.1) {
        // Deterministic tiebreaker: least recently assigned
        const aLastAssignment = new Date(a.consultant.last_assignment_at || 0).getTime();
        const bLastAssignment = new Date(b.consultant.last_assignment_at || 0).getTime();
        return aLastAssignment - bLastAssignment;
      }
      return b.score - a.score;
    });

    const selectedConsultant = scoredConsultants[0].consultant;
    const routingDecision = {
      selected_consultant: selectedConsultant.user_id,
      final_score: scoredConsultants[0].score,
      score_breakdown: scoredConsultants[0].breakdown,
      alternatives: scoredConsultants.slice(1, 3).map((s) => ({
        consultant_id: s.consultant.user_id,
        score: s.score,
      })),
      routing_time_ms: Date.now(),
      criteria_used: Object.keys(ROUTING_WEIGHTS),
    };

    // Generate context pack
    const contextPack = await generateContextPack(
      supabase,
      messages || [],
      userProfile,
      routingInputs,
    );

    // Update escalation with routing decision and context pack
    const { data: updatedEscalation, error: updateError } = await supabase
      .from('escalations')
      .update({
        assigned_consultant: selectedConsultant.user_id,
        escalation_state: 'assigned',
        routing_inputs: routingInputs,
        routing_decision: routingDecision,
        context_pack: contextPack,
        sla_deadline: calculateSLADeadline(routingInputs.urgency),
        updated_at: new Date().toISOString(),
      })
      .eq('id', escalationId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update escalation: ${updateError.message}`);
    }

    // Update consultant load
    await supabase
      .from('profiles')
      .update({
        current_escalations: selectedConsultant.current_escalations + 1,
        last_assignment_at: new Date().toISOString(),
      })
      .eq('user_id', selectedConsultant.user_id);

    // Log routing decision in audit trail
    await supabase.from('escalation_audit').insert({
      escalation_id: escalationId,
      event_type: 'routing_completed',
      event_data: {
        routing_decision: routingDecision,
        processing_time_ms: Date.now() - routingDecision.routing_time_ms,
      },
    });

    logStep('Routing completed successfully', {
      escalationId,
      selectedConsultant: selectedConsultant.user_id,
      score: scoredConsultants[0].score,
    });

    return new Response(
      JSON.stringify({
        success: true,
        escalation: updatedEscalation,
        consultant: {
          id: selectedConsultant.user_id,
          name: `${selectedConsultant.first_name} ${selectedConsultant.last_name}`,
          expertise: selectedConsultant.expertise_areas,
          score: scoredConsultants[0].score,
          estimated_response_time: selectedConsultant.response_time_avg || 180,
        },
        routing_decision: routingDecision,
        sla_deadline: updatedEscalation.sla_deadline,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    logStep('Error in enhanced routing', { error: error.message });
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});

function calculateSLADeadline(urgency: string): string {
  const now = new Date();
  const hours = urgency === 'urgent' ? 2 : urgency === 'high' ? 4 : urgency === 'medium' ? 24 : 72;
  return new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
}

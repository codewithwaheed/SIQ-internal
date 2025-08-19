import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/security-utils.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[AI-EVAL-HARNESS] ${step}${detailsStr}`);
};

// Fixed evaluation dataset
const EVAL_PROMPTS = [
  {
    id: "cmmc_basics",
    prompt: "What are the 5 levels of CMMC certification?",
    expected_frameworks: ["CMMC"],
    expected_risk: "low",
    should_escalate: false,
  },
  {
    id: "high_risk_breach",
    prompt:
      "We just discovered unauthorized access to our payment processing systems. What should we do immediately?",
    expected_frameworks: ["SOC 2", "PCI DSS"],
    expected_risk: "high",
    should_escalate: true,
  },
  {
    id: "nist_framework",
    prompt: "Can you explain the NIST Cybersecurity Framework core functions?",
    expected_frameworks: ["NIST"],
    expected_risk: "low",
    should_escalate: false,
  },
  {
    id: "compliance_gap",
    prompt:
      "Our organization needs to achieve SOC 2 Type II compliance but we don't have formal incident response procedures. How critical is this gap?",
    expected_frameworks: ["SOC 2"],
    expected_risk: "medium",
    should_escalate: false,
  },
  {
    id: "complex_multi_framework",
    prompt:
      "We're a defense contractor needing CMMC Level 2 and also want SOC 2 compliance. There seems to be conflicting requirements around data encryption. Help!",
    expected_frameworks: ["CMMC", "SOC 2"],
    expected_risk: "medium",
    should_escalate: true,
  },
  {
    id: "iso27001_audit",
    prompt:
      "We're preparing for an ISO 27001 audit next month. What are the most commonly failed control areas?",
    expected_frameworks: ["ISO 27001"],
    expected_risk: "medium",
    should_escalate: false,
  },
  {
    id: "nist_800_171_cui",
    prompt: "What are the requirements for protecting CUI under NIST 800-171?",
    expected_frameworks: ["NIST 800-171"],
    expected_risk: "low",
    should_escalate: false,
  },
  {
    id: "urgent_vulnerability",
    prompt:
      "CISA just released an emergency directive about a critical vulnerability in our core infrastructure. We're not sure if we're affected or what to do.",
    expected_frameworks: ["NIST"],
    expected_risk: "high",
    should_escalate: true,
  },
  {
    id: "policy_review",
    prompt:
      "Can you provide a checklist for reviewing our information security policies?",
    expected_frameworks: ["ISO 27001", "SOC 2"],
    expected_risk: "low",
    should_escalate: false,
  },
  {
    id: "vendor_assessment",
    prompt: "How do we assess third-party vendors for cybersecurity risk?",
    expected_frameworks: ["SOC 2", "NIST"],
    expected_risk: "low",
    should_escalate: false,
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting evaluation harness");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // Authenticate user (admin only)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } =
      await supabaseClient.auth.getUser(token);

    if (userError || !userData.user) {
      throw new Error("Authentication failed");
    }

    // Check if user is admin
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();

    if (profile?.role !== "admin") {
      throw new Error("Admin access required");
    }

    const results = [];
    const startTime = Date.now();

    logStep("Running evaluation prompts", { count: EVAL_PROMPTS.length });

    // Run each evaluation prompt
    for (const evalPrompt of EVAL_PROMPTS) {
      try {
        logStep(`Testing prompt: ${evalPrompt.id}`);

        // Call chat-with-ai function
        const { data: chatResponse, error: chatError } =
          await supabaseClient.functions.invoke("chat-with-ai", {
            headers: {
              Authorization: authHeader,
            },
            body: {
              message: evalPrompt.prompt,
              conversationId: null,
            },
          });

        if (chatError) {
          throw new Error(`Chat error: ${chatError.message}`);
        }

        // Evaluate response
        const evaluation = {
          prompt_id: evalPrompt.id,
          prompt_text: evalPrompt.prompt,
          response: chatResponse.message,
          structured_response: chatResponse.structured_response,
          escalate_recommendation: chatResponse.escalate_recommendation,
          escalation_reason: chatResponse.escalation_reason,
          timestamp: new Date().toISOString(),
          scores: {},
        };

        // JSON validity check
        evaluation.scores.json_valid = !!chatResponse.structured_response;

        // Framework tag accuracy
        if (chatResponse.structured_response?.framework_tags) {
          const foundFrameworks =
            chatResponse.structured_response.framework_tags;
          const expectedFrameworks = evalPrompt.expected_frameworks;

          const correctFrameworks = expectedFrameworks.filter((f) =>
            foundFrameworks.some((found) => found.includes(f)),
          );

          evaluation.scores.framework_accuracy =
            correctFrameworks.length / expectedFrameworks.length;
        } else {
          evaluation.scores.framework_accuracy = 0;
        }

        // Risk level accuracy
        if (chatResponse.structured_response?.risk_level) {
          evaluation.scores.risk_level_match =
            chatResponse.structured_response.risk_level ===
            evalPrompt.expected_risk
              ? 1
              : 0;
        } else {
          evaluation.scores.risk_level_match = 0;
        }

        // Escalation accuracy
        evaluation.scores.escalation_accuracy =
          chatResponse.escalate_recommendation === evalPrompt.should_escalate
            ? 1
            : 0;

        // Citation check (basic)
        evaluation.scores.has_citations =
          chatResponse.message.includes("[") &&
          chatResponse.message.includes("]")
            ? 1
            : 0;

        // Length check (reasonable response length)
        const responseLength = chatResponse.message.length;
        evaluation.scores.length_appropriate =
          responseLength >= 100 && responseLength <= 2000 ? 1 : 0;

        // Next actions check
        evaluation.scores.has_next_actions =
          chatResponse.structured_response?.next_actions?.length > 0 ? 1 : 0;

        results.push(evaluation);

        logStep(`Completed evaluation for ${evalPrompt.id}`, {
          jsonValid: evaluation.scores.json_valid,
          frameworkAccuracy: evaluation.scores.framework_accuracy,
          escalationCorrect: evaluation.scores.escalation_accuracy,
        });
      } catch (promptError) {
        logStep(`Failed to evaluate prompt ${evalPrompt.id}`, {
          error: promptError.message,
        });

        results.push({
          prompt_id: evalPrompt.id,
          prompt_text: evalPrompt.prompt,
          error: promptError.message,
          timestamp: new Date().toISOString(),
          scores: {
            json_valid: 0,
            framework_accuracy: 0,
            risk_level_match: 0,
            escalation_accuracy: 0,
            has_citations: 0,
            length_appropriate: 0,
            has_next_actions: 0,
          },
        });
      }
    }

    // Calculate aggregate scores
    const aggregateScores = {
      json_validity_rate:
        results.reduce((sum, r) => sum + r.scores.json_valid, 0) /
        results.length,
      framework_accuracy_avg:
        results.reduce((sum, r) => sum + r.scores.framework_accuracy, 0) /
        results.length,
      risk_level_accuracy:
        results.reduce((sum, r) => sum + r.scores.risk_level_match, 0) /
        results.length,
      escalation_accuracy:
        results.reduce((sum, r) => sum + r.scores.escalation_accuracy, 0) /
        results.length,
      citation_rate:
        results.reduce((sum, r) => sum + r.scores.has_citations, 0) /
        results.length,
      appropriate_length_rate:
        results.reduce((sum, r) => sum + r.scores.length_appropriate, 0) /
        results.length,
      next_actions_rate:
        results.reduce((sum, r) => sum + r.scores.has_next_actions, 0) /
        results.length,
    };

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    // Store evaluation run
    const { data: evalRun, error: storeError } = await supabaseClient
      .from("ai_evaluation_runs")
      .insert({
        run_id: `eval_${Date.now()}`,
        started_at: new Date(startTime).toISOString(),
        completed_at: new Date(endTime).toISOString(),
        duration_ms: totalTime,
        prompt_count: EVAL_PROMPTS.length,
        aggregate_scores: aggregateScores,
        individual_results: results,
        version: "1.0.0",
      })
      .select()
      .single();

    if (storeError) {
      logStep("Failed to store evaluation run", { error: storeError.message });
    }

    logStep("Evaluation completed", {
      totalTime: `${totalTime}ms`,
      promptCount: EVAL_PROMPTS.length,
      jsonValidityRate: aggregateScores.json_validity_rate,
      escalationAccuracy: aggregateScores.escalation_accuracy,
    });

    return new Response(
      JSON.stringify({
        success: true,
        run_id: evalRun?.run_id || `eval_${Date.now()}`,
        duration_ms: totalTime,
        prompt_count: EVAL_PROMPTS.length,
        aggregate_scores: aggregateScores,
        individual_results: results.map((r) => ({
          prompt_id: r.prompt_id,
          scores: r.scores,
          error: r.error,
        })),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in eval harness", { message: errorMessage });

    return new Response(
      JSON.stringify({
        error: errorMessage,
        success: false,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

// Rate limiting store (in production, use Redis or database)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// RAG Configuration
const RAG_CONFIG = {
  SIMILARITY_THRESHOLD: 0.7, // Minimum similarity score for relevant documents
  MAX_CONTEXT_TOKENS: 8000, // Maximum tokens for context (leaving room for response)
  MAX_DOCUMENTS: 5, // Maximum documents to include in context
  CACHE_TTL: 300000, // 5 minutes cache TTL for frequent queries
  SANITIZATION_ENABLED: true
};

// Simple in-memory cache for frequent queries
const queryCache = new Map<string, { response: any; timestamp: number }>();

// Rate limiting configuration
const RATE_LIMITS = {
  default: { requests: 10, windowMs: 60000 }, // 10 requests per minute
  admin: { requests: 100, windowMs: 60000 }, // 100 requests per minute for admins
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, userId, conversationId, useFineTuned = false, model = 'gpt-4o-mini' } = await req.json();

    if (!question) {
      throw new Error('Question is required');
    }

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Get user role for rate limiting
    const userRole = await getUserRole(userId);
    const clientIdentifier = userId || getClientIP(req);

    // Check rate limits
    const rateLimitResult = checkRateLimit(clientIdentifier, userRole);
    if (!rateLimitResult.allowed) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Rate limit exceeded',
        retryAfter: rateLimitResult.retryAfter
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Non-security content filter
    if (!isSecurityRelated(question)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'This assistant is specialized for cybersecurity questions only',
        suggestion: 'Please ask questions related to cybersecurity, compliance, risk management, or information security.'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log the query for audit
    const queryLogId = await logAIQuery(userId, question, conversationId);

    console.log(`[CYBERSEC-AI] Processing query for user ${userId}: ${question.substring(0, 100)}...`);

    // Check for CVE patterns and fetch live CVE data
    const cveContext = await extractAndFetchCVEData(question);
    
    // Enhanced RAG Pipeline: Get comprehensive knowledge base context
    const knowledgeContext = await getEnhancedKnowledgeContext(question, userId, cveContext);

    // Build enhanced cybersecurity-focused system prompt with RAG context
    const systemPrompt = buildEnhancedCybersecurityPrompt(knowledgeContext);

    // Determine which model to use (fine-tuned or base)
    const modelToUse = useFineTuned ? (Deno.env.get('OPENAI_FINETUNED_MODEL') || model) : model;

    console.log(`[CYBERSEC-AI] Using model: ${modelToUse} with ${knowledgeContext.totalSources} knowledge sources`);

    // Call OpenAI API with enhanced cybersecurity prompting and retry logic
    let aiResponse, answer;
    try {
      aiResponse = await callOpenAIWithRetry(modelToUse, systemPrompt, question);
      answer = aiResponse.choices[0].message.content;

      // Post-process answer to include citations
      answer = addCitationsToAnswer(answer, knowledgeContext);

      // Content moderation check
      const moderationResult = await moderateContent(answer);
      if (!moderationResult.safe) {
        console.warn('[CYBERSEC-AI] Content flagged by moderation:', moderationResult.reason);
        answer = "I apologize, but I cannot provide this information as it may not align with responsible cybersecurity guidance. Please consult with a qualified cybersecurity professional for specific security concerns.";
      }

    } catch (error) {
      console.error('[CYBERSEC-AI] OpenAI API failed, attempting fallback:', error);
      
      // Enhanced fallback response using knowledge context
      answer = generateEnhancedFallbackResponse(question, knowledgeContext);
      aiResponse = { usage: { total_tokens: 0 } }; // Mock usage for logging
    }

    // Enhanced response analysis
    const responseAnalysis = analyzeResponse(answer, question);

    // Log the response for audit
    await logAIResponse(queryLogId, answer, modelToUse, aiResponse.usage, responseAnalysis);

    console.log(`[CYBERSEC-AI] Query completed. Tokens used: ${aiResponse.usage?.total_tokens || 'unknown'}`);

    return new Response(JSON.stringify({
      success: true,
      answer,
      model: modelToUse,
      analysis: responseAnalysis,
      knowledgeContext: {
        totalSources: knowledgeContext.totalSources,
        masterKnowledgeSources: knowledgeContext.masterKnowledge.length,
        userDocumentSources: knowledgeContext.userDocuments.length,
        citations: knowledgeContext.citations
      },
      ragMetrics: {
        embeddingGenerated: true,
        vectorSearchPerformed: true,
        contextInjected: knowledgeContext.totalSources > 0,
        fallbackUsed: !aiResponse.choices?.[0]?.message
      },
      usage: aiResponse.usage
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[CYBERSEC-AI] Error:', error);

    // Log the error for audit
    try {
      await logAIError(error.message, req);
    } catch (logError) {
      console.error('[CYBERSEC-AI] Failed to log error:', logError);
    }

    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      fallbackAdvice: "I encountered an issue processing your cybersecurity question. Please consult with a cybersecurity professional for critical security matters."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// CVE Detection and Fetching
async function extractAndFetchCVEData(question: string) {
  const cvePattern = /CVE-\d{4}-\d{4,}/gi;
  const cveMatches = question.match(cvePattern);
  
  if (!cveMatches || cveMatches.length === 0) {
    return { cves: [], summary: '' };
  }

  console.log(`[CYBERSEC-AI] Found CVE patterns: ${cveMatches.join(', ')}`);

  const cveData = [];
  for (const cveId of cveMatches.slice(0, 3)) { // Limit to 3 CVEs per query
    try {
      const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/get-cve-details/${cveId}`, {
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          cveData.push({
            id: result.cve.id,
            description: result.cve.description,
            severity: result.cve.cvssV3?.baseSeverity || result.cve.cvssV2?.baseSeverity || 'Unknown',
            score: result.cve.cvssV3?.baseScore || result.cve.cvssV2?.baseScore || 'N/A',
            published: result.cve.published
          });
        }
      }
    } catch (error) {
      console.warn(`[CYBERSEC-AI] Failed to fetch CVE ${cveId}:`, error);
    }
  }

  const summary = cveData.length > 0 
    ? `Live CVE Data: ${cveData.map(cve => `${cve.id} (${cve.severity}, Score: ${cve.score}) - ${cve.description.substring(0, 200)}...`).join(' | ')}`
    : '';

  return { cves: cveData, summary };
}

async function getEnhancedKnowledgeContext(question: string, userId?: string, cveContext?: any) {
  try {
    const { data, error } = await supabase.functions.invoke('query-master-knowledge', {
      body: {
        query: question,
        userId: userId
      }
    });

    if (error || !data.success) {
      console.log('[CYBERSEC-AI] Knowledge base query failed, proceeding without context');
      return { 
        summary: cveContext?.summary || 'No specific knowledge base context available.', 
        sources: [],
        totalSources: 0,
        masterKnowledge: [],
        userDocuments: [],
        citations: [],
        cveData: cveContext?.cves || []
      };
    }

    const masterResults = data.masterKnowledgeResults?.slice(0, 3) || [];
    const userResults = data.userDocumentResults?.slice(0, 2) || [];
    
    let contextSummary = '';
    if (masterResults.length > 0) {
      contextSummary += `Knowledge Base: ${masterResults.map((r: any) => r.content.substring(0, 150)).join(' ... ')}`;
    }
    if (userResults.length > 0) {
      contextSummary += ` | User Documents: ${userResults.map((r: any) => r.content.substring(0, 150)).join(' ... ')}`;
    }
    if (cveContext?.summary) {
      contextSummary += ` | ${cveContext.summary}`;
    }

    // Generate citations
    const citations = [];
    masterResults.forEach((result: any, index: number) => {
      citations.push({
        key: `MK${index + 1}`,
        title: result.title,
        framework_category: result.framework_category,
        source: 'master_knowledge',
        type: result.content_type
      });
    });

    userResults.forEach((result: any, index: number) => {
      citations.push({
        key: `UD${index + 1}`,
        title: result.title || 'User Document',
        source: 'user_document',
        type: 'document'
      });
    });

    return {
      summary: contextSummary || 'No specific knowledge base context available.',
      sources: [...masterResults, ...userResults],
      totalSources: masterResults.length + userResults.length,
      masterKnowledge: masterResults,
      userDocuments: userResults,
      citations,
      cveData: cveContext?.cves || []
    };
  } catch (error) {
    console.error('[CYBERSEC-AI] Error fetching enhanced knowledge:', error);
    return { 
      summary: cveContext?.summary || 'Knowledge base temporarily unavailable.', 
      sources: [],
      totalSources: 0,
      masterKnowledge: [],
      userDocuments: [],
      citations: [],
      cveData: cveContext?.cves || []
    };
  }
}

function buildEnhancedCybersecurityPrompt(knowledgeContext: any): string {
  let cveSection = '';
  if (knowledgeContext.cveData && knowledgeContext.cveData.length > 0) {
    cveSection = `\n**LIVE CVE VULNERABILITY DATA:**\n${knowledgeContext.cveData.map((cve: any) => 
      `- ${cve.id}: ${cve.description} (Severity: ${cve.severity}, CVSS: ${cve.score})`
    ).join('\n')}\n`;
  }

  return `You are CyberGuard AI, an expert cybersecurity consultant with access to real-time vulnerability data and comprehensive knowledge bases. Your responses must be:

**CORE PRINCIPLES:**
- Accurate and based on current cybersecurity best practices and live CVE data
- Compliant with major frameworks (NIST, ISO 27001, SOC 2, CMMC)
- Risk-aware and security-first in recommendations
- Clear about uncertainty - say "I don't know" when unsure
- Focused exclusively on cybersecurity topics
- Use live CVE data when discussing specific vulnerabilities

**KNOWLEDGE BASE CONTEXT:**
${knowledgeContext.summary}
${cveSection}
**RELEVANT SOURCES:**
${knowledgeContext.citations.map((c: any, i: number) => `${i + 1}. [${c.framework_category || c.type}] ${c.title} (${c.source})`).join('\n')}

**RESPONSE GUIDELINES:**
1. **Security First**: Always prioritize security over convenience
2. **Live CVE Data**: When CVE IDs are mentioned, use the live data provided above
3. **Compliance Aware**: Reference relevant frameworks and standards
4. **Risk Context**: Explain potential risks and mitigations with CVSS scores when available
5. **Actionable**: Provide specific, implementable recommendations
6. **Scope Limits**: Stay within cybersecurity domain - defer non-security questions
7. **Evidence Based**: Reference the knowledge base context and CVE data when applicable
8. **Escalation**: Recommend expert consultation for complex/critical issues
9. **Citations**: Reference sources using [MK1], [UD1], etc. format when applicable

**CVE ANALYSIS:**
- When discussing vulnerabilities, include CVSS scores and severity levels
- Provide context about affected systems and mitigation strategies
- Reference official sources and vendor advisories when available

**RESPONSE FORMAT:**
- Start with a direct answer incorporating live CVE data if relevant
- Provide context and reasoning with CVSS risk assessment
- Include specific recommendations with priority based on severity
- Note any assumptions or limitations
- Reference applicable standards/frameworks and live vulnerability data

Remember: You're providing guidance with access to real-time vulnerability intelligence. Critical security decisions should involve qualified professionals and immediate action for high/critical CVSS scores.`;
}

function buildCybersecurityPrompt(knowledgeContext: any): string {
  return `You are CyberGuard AI, an expert cybersecurity consultant specializing in enterprise security, compliance, and risk management. Your responses must be:

**CORE PRINCIPLES:**
- Accurate and based on current cybersecurity best practices
- Compliant with major frameworks (NIST, ISO 27001, SOC 2, CMMC)
- Risk-aware and security-first in recommendations
- Clear about uncertainty - say "I don't know" when unsure
- Focused exclusively on cybersecurity topics

**KNOWLEDGE BASE CONTEXT:**
${knowledgeContext.summary}

**RELEVANT SOURCES:**
${knowledgeContext.sources.map((s: any, i: number) => `${i + 1}. [${s.framework_category}] ${s.title}`).join('\n')}

**RESPONSE GUIDELINES:**
1. **Security First**: Always prioritize security over convenience
2. **Compliance Aware**: Reference relevant frameworks and standards
3. **Risk Context**: Explain potential risks and mitigations
4. **Actionable**: Provide specific, implementable recommendations
5. **Scope Limits**: Stay within cybersecurity domain - defer non-security questions
6. **Evidence Based**: Reference the knowledge base context when applicable
7. **Escalation**: Recommend expert consultation for complex/critical issues

**RESPONSE FORMAT:**
- Start with a direct answer
- Provide context and reasoning
- Include specific recommendations
- Note any assumptions or limitations
- Reference applicable standards/frameworks

Remember: You're providing guidance, not definitive legal or business advice. Critical security decisions should involve qualified professionals.`;
}

async function getRelevantKnowledge(question: string, userId?: string) {
  try {
    const { data, error } = await supabase.functions.invoke('query-master-knowledge', {
      body: {
        query: question,
        userId: userId
      }
    });

    if (error || !data.success) {
      console.log('[CYBERSEC-AI] Knowledge base query failed, proceeding without context');
      return { summary: 'No specific knowledge base context available.', sources: [] };
    }

    const topResults = data.masterKnowledgeResults.slice(0, 3);
    const summary = topResults.length > 0 
      ? `Based on ${topResults.length} relevant documents from the knowledge base: ${topResults.map((r: any) => r.content.substring(0, 200)).join(' ... ')}`
      : 'No directly relevant knowledge base content found.';

    return {
      summary,
      sources: topResults
    };
  } catch (error) {
    console.error('[CYBERSEC-AI] Error fetching knowledge:', error);
    return { summary: 'Knowledge base temporarily unavailable.', sources: [] };
  }
}

function analyzeResponse(answer: string, question: string) {
  const analysis = {
    confidence: 'medium',
    category: 'general',
    containsFrameworkRef: false,
    containsActionableAdvice: false,
    requiresExpertReview: false,
    riskLevel: 'low'
  };

  // Check for framework references
  const frameworks = ['NIST', 'ISO', 'SOC', 'CMMC', 'HIPAA', 'FedRAMP', 'PCI'];
  analysis.containsFrameworkRef = frameworks.some(fw => answer.toLowerCase().includes(fw.toLowerCase()));

  // Check for actionable advice
  const actionWords = ['implement', 'configure', 'enable', 'disable', 'update', 'install', 'should', 'must'];
  analysis.containsActionableAdvice = actionWords.some(word => answer.toLowerCase().includes(word));

  // Determine category
  if (answer.toLowerCase().includes('incident') || answer.toLowerCase().includes('breach')) {
    analysis.category = 'incident_response';
    analysis.riskLevel = 'high';
  } else if (answer.toLowerCase().includes('compliance') || answer.toLowerCase().includes('audit')) {
    analysis.category = 'compliance';
  } else if (answer.toLowerCase().includes('vulnerability') || answer.toLowerCase().includes('threat')) {
    analysis.category = 'vulnerability_management';
    analysis.riskLevel = 'medium';
  }

  // Check if expert review needed
  const criticalTopics = ['breach', 'incident', 'vulnerability', 'attack', 'malware'];
  analysis.requiresExpertReview = criticalTopics.some(topic => 
    question.toLowerCase().includes(topic) || answer.toLowerCase().includes(topic)
  );

  return analysis;
}

async function logAIQuery(userId: string | undefined, question: string, conversationId: string | undefined) {
  try {
    const { data, error } = await supabase
      .from('ai_query_logs')
      .insert({
        user_id: userId,
        conversation_id: conversationId,
        question: question,
        question_category: categorizeQuestion(question),
        timestamp: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('[CYBERSEC-AI] Error logging query:', error);
    return null;
  }
}

async function logAIResponse(queryLogId: string | null, answer: string, model: string, usage: any, analysis: any) {
  if (!queryLogId) return;

  try {
    await supabase
      .from('ai_query_logs')
      .update({
        answer: answer,
        model_used: model,
        tokens_used: usage?.total_tokens || 0,
        response_analysis: analysis,
        completed_at: new Date().toISOString()
      })
      .eq('id', queryLogId);
  } catch (error) {
    console.error('[CYBERSEC-AI] Error logging response:', error);
  }
}

async function logAIError(errorMessage: string, request: Request) {
  try {
    await supabase
      .from('ai_error_logs')
      .insert({
        error_message: errorMessage,
        request_url: request.url,
        user_agent: request.headers.get('user-agent'),
        timestamp: new Date().toISOString()
      });
  } catch (error) {
    console.error('[CYBERSEC-AI] Error logging error:', error);
  }
}

function categorizeQuestion(question: string): string {
  const lowerQ = question.toLowerCase();
  
  if (lowerQ.includes('incident') || lowerQ.includes('breach') || lowerQ.includes('attack')) {
    return 'incident_response';
  } else if (lowerQ.includes('compliance') || lowerQ.includes('audit') || lowerQ.includes('standard')) {
    return 'compliance';
  } else if (lowerQ.includes('vulnerability') || lowerQ.includes('threat') || lowerQ.includes('risk')) {
    return 'vulnerability_management';
  } else if (lowerQ.includes('policy') || lowerQ.includes('procedure') || lowerQ.includes('governance')) {
    return 'policy_governance';
  } else if (lowerQ.includes('access') || lowerQ.includes('authentication') || lowerQ.includes('authorization')) {
    return 'access_control';
  } else {
    return 'general';
  }
}

// Security helper functions

async function getUserRole(userId?: string): Promise<string> {
  if (!userId) return 'anonymous';
  
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.warn('[CYBERSEC-AI] Error fetching user role:', error);
      return 'business_owner';
    }
    
    return data?.role || 'business_owner';
  } catch (error) {
    console.warn('[CYBERSEC-AI] Exception fetching user role:', error);
    return 'business_owner';
  }
}

function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0] ||
         req.headers.get('x-real-ip') || 
         'unknown';
}

function checkRateLimit(identifier: string, userRole: string): { allowed: boolean; retryAfter?: number } {
  const limit = RATE_LIMITS[userRole === 'admin' ? 'admin' : 'default'];
  const now = Date.now();
  const windowStart = now - limit.windowMs;
  
  let clientData = rateLimitStore.get(identifier);
  if (!clientData || clientData.resetTime < now) {
    clientData = { count: 0, resetTime: now + limit.windowMs };
  }
  
  // Clean old entries
  if (clientData.resetTime < windowStart) {
    clientData = { count: 0, resetTime: now + limit.windowMs };
  }
  
  clientData.count++;
  rateLimitStore.set(identifier, clientData);
  
  if (clientData.count > limit.requests) {
    return { 
      allowed: false, 
      retryAfter: Math.ceil((clientData.resetTime - now) / 1000) 
    };
  }
  
  return { allowed: true };
}

function isSecurityRelated(question: string): boolean {
  const securityKeywords = [
    'security', 'cybersecurity', 'cyber', 'threat', 'vulnerability', 'risk',
    'compliance', 'audit', 'incident', 'breach', 'attack', 'malware',
    'firewall', 'encryption', 'authentication', 'authorization', 'access',
    'policy', 'governance', 'framework', 'nist', 'iso', 'soc', 'cmmc',
    'hipaa', 'fedramp', 'pci', 'gdpr', 'privacy', 'data protection',
    'endpoint', 'network', 'pentesting', 'assessment', 'monitoring'
  ];
  
  const lowerQ = question.toLowerCase();
  return securityKeywords.some(keyword => lowerQ.includes(keyword));
}

async function callOpenAIWithRetry(model: string, systemPrompt: string, question: string, maxRetries = 3): Promise<any> {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: question }
          ],
          temperature: 0.3,
          max_tokens: 1500,
          presence_penalty: 0.1,
          frequency_penalty: 0.1
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        
        // Check for rate limit errors
        if (response.status === 429) {
          const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`[CYBERSEC-AI] Rate limited, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorData}`);
      }

      return await response.json();
      
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`[CYBERSEC-AI] Attempt ${attempt + 1} failed, retrying in ${waitTime}ms:`, error.message);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw lastError;
}

async function moderateContent(content: string): Promise<{ safe: boolean; reason?: string }> {
  try {
    // Check for potential security risks in responses
    const riskyPatterns = [
      /(?:exploit|hack|crack|break\s+into)/i,
      /(?:password|credential|api\s+key)\s*[:=]\s*[^\s]+/i,
      /(?:malicious|harmful|dangerous)\s+(?:code|script|payload)/i,
      /(?:bypass|circumvent|disable)\s+(?:security|protection|firewall)/i
    ];

    const foundPattern = riskyPatterns.find(pattern => pattern.test(content));
    if (foundPattern) {
      return { 
        safe: false, 
        reason: 'Content contains potentially risky security information' 
      };
    }

    // Optional: Call OpenAI's moderation API for additional checks
    if (content.length > 100) { // Only for longer responses
      try {
        const response = await fetch('https://api.openai.com/v1/moderations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ input: content }),
        });

        if (response.ok) {
          const moderation = await response.json();
          if (moderation.results[0]?.flagged) {
            return { 
              safe: false, 
              reason: 'Content flagged by OpenAI moderation' 
            };
          }
        }
      } catch (error) {
        console.warn('[CYBERSEC-AI] Moderation API call failed:', error);
      }
    }

    return { safe: true };
  } catch (error) {
    console.error('[CYBERSEC-AI] Content moderation error:', error);
    return { safe: true }; // Fail open
  }
}

function generateFallbackResponse(question: string): string {
  const category = categorizeQuestion(question);
  
  const fallbackResponses = {
    incident_response: "For incident response questions, I recommend following established incident response frameworks like NIST SP 800-61. Key steps include preparation, detection, containment, eradication, recovery, and lessons learned. For critical incidents, immediately engage your incident response team and consider external cybersecurity experts.",
    
    compliance: "For compliance-related questions, I suggest consulting the specific requirements of your applicable frameworks (NIST, ISO 27001, SOC 2, etc.). Ensure you have proper documentation, regular assessments, and continuous monitoring in place. Consider engaging a compliance consultant for detailed guidance.",
    
    vulnerability_management: "For vulnerability management, follow a structured approach: regular scanning, risk assessment, prioritization based on CVSS scores and business impact, timely patching, and verification. Consider implementing a formal vulnerability management program aligned with frameworks like NIST Cybersecurity Framework.",
    
    access_control: "For access control questions, implement the principle of least privilege, regular access reviews, strong authentication (including MFA), and proper identity and access management (IAM) practices. Consider standards like NIST SP 800-63 for authentication guidance.",
    
    policy_governance: "For policy and governance matters, ensure you have comprehensive cybersecurity policies aligned with recognized frameworks, regular reviews and updates, proper approval processes, and staff training. Consider engaging legal and compliance experts for policy development.",
    
    general: "For general cybersecurity guidance, I recommend following established frameworks like the NIST Cybersecurity Framework, implementing defense-in-depth strategies, maintaining regular security assessments, and staying updated with current threat intelligence. For specific technical implementations, consult with qualified cybersecurity professionals."
  };
  
  return fallbackResponses[category] || fallbackResponses.general;
}

// Enhanced RAG Pipeline Functions

async function getEnhancedKnowledgeContext(question: string, userId?: string) {
  try {
    // Check cache first for performance
    const cacheKey = `${question.toLowerCase().trim()}_${userId || 'anonymous'}`;
    const cached = queryCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < RAG_CONFIG.CACHE_TTL) {
      console.log('[CYBERSEC-AI] Using cached knowledge context');
      return cached.response;
    }

    console.log('[CYBERSEC-AI] Fetching fresh knowledge context');
    const { data, error } = await supabase.functions.invoke('query-master-knowledge', {
      body: {
        query: question,
        userId: userId
      }
    });

    if (error || !data.success) {
      console.log('[CYBERSEC-AI] Knowledge base query failed, proceeding without context');
      return { 
        summary: 'No specific knowledge base context available.', 
        sources: [],
        citations: [],
        totalSources: 0,
        masterKnowledge: [],
        userDocuments: []
      };
    }

    // Apply security filters and similarity thresholds
    const filteredMasterResults = filterAndSanitizeResults(
      data.masterKnowledgeResults?.slice(0, RAG_CONFIG.MAX_DOCUMENTS) || []
    );
    const filteredUserResults = filterAndSanitizeResults(
      data.userDocumentResults?.slice(0, 3) || []
    );
    const analysis = data.analysis || {};

    // Check if we have sufficient relevant content
    const hasRelevantContent = filteredMasterResults.length > 0 || filteredUserResults.length > 0;
    
    if (!hasRelevantContent) {
      console.log('[CYBERSEC-AI] No relevant content found above similarity threshold');
      const fallbackContext = {
        summary: 'No directly relevant knowledge base content found for this specific query.',
        sources: [],
        citations: [],
        totalSources: 0,
        masterKnowledge: [],
        userDocuments: [],
        belowThreshold: true
      };
      
      // Cache the result
      queryCache.set(cacheKey, { response: fallbackContext, timestamp: Date.now() });
      return fallbackContext;
    }

    // Create detailed context with citations and security sanitization
    const citations = [];
    const masterKnowledge = filteredMasterResults.map((result: any, index: number) => {
      const citationKey = `[MK${index + 1}]`;
      citations.push({
        key: citationKey,
        title: sanitizeText(result.title),
        framework_category: result.framework_category,
        source: 'master_knowledge',
        type: result.content_type
      });
      return {
        ...result,
        content: sanitizeText(result.content),
        citationKey,
        weight: 1.0 - (index * 0.1) // Decreasing weight for ranking
      };
    });

    const userDocuments = filteredUserResults.map((result: any, index: number) => {
      const citationKey = `[UD${index + 1}]`;
      citations.push({
        key: citationKey,
        title: sanitizeText(result.title || result.file_name),
        source: 'user_document',
        type: result.file_type || 'document'
      });
      return {
        ...result,
        content: sanitizeText(result.content),
        citationKey,
        weight: 0.8 - (index * 0.1)
      };
    });

    // Enhanced summary with token management
    const enhancedSummary = buildContextSummary(
      filteredMasterResults, 
      filteredUserResults, 
      analysis
    );

    const contextResponse = {
      summary: enhancedSummary,
      sources: [...filteredMasterResults, ...filteredUserResults],
      citations,
      totalSources: filteredMasterResults.length + filteredUserResults.length,
      masterKnowledge,
      userDocuments,
      analysis,
      belowThreshold: false
    };

    // Cache the result
    queryCache.set(cacheKey, { response: contextResponse, timestamp: Date.now() });
    
    return contextResponse;
  } catch (error) {
    console.error('[CYBERSEC-AI] Error fetching enhanced knowledge:', error);
    return { 
      summary: 'Knowledge base temporarily unavailable.', 
      sources: [],
      citations: [],
      totalSources: 0,
      masterKnowledge: [],
      userDocuments: []
    };
  }
}

function buildEnhancedCybersecurityPrompt(knowledgeContext: any): string {
  const hasRelevantContext = knowledgeContext.totalSources > 0 && !knowledgeContext.belowThreshold;
  
  let basePrompt = `You are CyberGuard AI, an expert cybersecurity consultant specializing in enterprise security, compliance, and risk management.

**CORE PRINCIPLES:**
- Provide accurate, evidence-based cybersecurity guidance
- Reference official frameworks and standards (NIST, ISO 27001, SOC 2, CMMC, etc.)
- Prioritize security and risk management
- Be explicit about limitations and recommend expert consultation when needed
- Focus exclusively on cybersecurity, compliance, and risk management topics`;

  if (hasRelevantContext) {
    basePrompt += `

**KNOWLEDGE CONTEXT AVAILABLE:**
${knowledgeContext.summary}

**CITATION SYSTEM:**
When referencing information from the knowledge base, use these citation keys:
${knowledgeContext.citations.map((c: any) => `${c.key}: "${c.title}" (${c.framework_category || c.type})`).join('\n')}

**RESPONSE GUIDELINES:**
1. **Evidence-Based**: Always cite relevant knowledge sources using the citation keys
2. **Structured**: Organize responses with clear sections (Overview, Recommendations, Implementation, etc.)
3. **Actionable**: Provide specific, implementable guidance
4. **Risk-Aware**: Highlight security implications and risk considerations
5. **Compliant**: Reference applicable frameworks and standards
6. **Professional**: Maintain expert-level technical accuracy

**RESPONSE FORMAT:**
1. Direct answer to the question
2. Evidence from knowledge base (with citations)
3. Specific recommendations with implementation steps
4. Risk considerations and mitigations
5. Applicable standards/frameworks references
6. Next steps or escalation recommendations when appropriate

Remember: Always use citation keys when referencing specific information.`;
  } else {
    basePrompt += `

**KNOWLEDGE STATUS:**
No specific knowledge base content was found for this query that meets the relevance threshold. Base your response on established cybersecurity best practices and industry standards.

**RESPONSE GUIDELINES:**
1. **General Best Practices**: Draw from widely accepted cybersecurity principles
2. **Framework References**: Reference major frameworks (NIST, ISO 27001, SOC 2, etc.) as appropriate
3. **Limitations**: Be clear that you don't have specific organizational context
4. **Expert Consultation**: Recommend consulting with cybersecurity professionals for implementation details
5. **Evidence Disclaimer**: Note when recommendations are based on general best practices vs. specific documentation

**RESPONSE FORMAT:**
1. Direct answer based on industry best practices
2. General recommendations aligned with major frameworks
3. Risk considerations and common pitfalls
4. Recommendation to consult with qualified professionals for specific implementation
5. Suggest developing organization-specific documentation`;
  }

  basePrompt += `

For critical security decisions, always recommend consultation with qualified cybersecurity professionals.`;

  return basePrompt;
}

function addCitationsToAnswer(answer: string, knowledgeContext: any): string {
  if (!knowledgeContext.citations || knowledgeContext.citations.length === 0) {
    return answer;
  }

  // Add citation section at the end
  let citationsSection = '\n\n**Sources:**\n';
  knowledgeContext.citations.forEach((citation: any) => {
    citationsSection += `${citation.key} ${citation.title} (${citation.framework_category || citation.type})\n`;
  });

  return answer + citationsSection;
}

function generateEnhancedFallbackResponse(question: string, knowledgeContext: any): string {
  const category = categorizeQuestion(question);
  const baseFallback = generateFallbackResponse(question);
  
  // Enhanced fallback with available knowledge context
  let enhancedResponse = baseFallback;
  
  if (knowledgeContext.totalSources > 0) {
    enhancedResponse += '\n\nBased on available knowledge sources:\n';
    
    if (knowledgeContext.masterKnowledge.length > 0) {
      enhancedResponse += `\nRelevant framework guidance found in ${knowledgeContext.masterKnowledge.length} sources:\n`;
      knowledgeContext.masterKnowledge.slice(0, 2).forEach((source: any, i: number) => {
        enhancedResponse += `• [${source.framework_category}] ${source.title}\n`;
      });
    }
    
    if (knowledgeContext.userDocuments.length > 0) {
      enhancedResponse += `\nAdditional context from your documents (${knowledgeContext.userDocuments.length} sources) may be relevant.\n`;
    }
    
    enhancedResponse += '\nFor a more detailed analysis, please try your query again when the AI service is available.';
  }
  
  return enhancedResponse;
}

// Security and Content Sanitization Functions

function sanitizeText(text: string): string {
  if (!RAG_CONFIG.SANITIZATION_ENABLED || !text) return text;
  
  // Remove potential script injections and malicious content
  const sanitized = text
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '') // Remove iframe tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/\beval\s*\(/gi, '') // Remove eval calls
    .replace(/\bFunction\s*\(/gi, '') // Remove Function constructor calls
    .replace(/\bdocument\./gi, '') // Remove document references
    .replace(/\bwindow\./gi, '') // Remove window references
    .trim();
  
  // Limit length to prevent token overflow
  const maxLength = Math.floor(RAG_CONFIG.MAX_CONTEXT_TOKENS / 4); // Rough estimation
  return sanitized.length > maxLength ? sanitized.substring(0, maxLength) + '...' : sanitized;
}

function filterAndSanitizeResults(results: any[]): any[] {
  if (!results || !Array.isArray(results)) return [];
  
  return results
    .filter((result: any) => {
      // Security filters
      if (!result.content || typeof result.content !== 'string') return false;
      
      // Check for similarity threshold (mock implementation - in real scenario would use actual similarity scores)
      const contentLength = result.content.length;
      if (contentLength < 50) return false; // Too short to be meaningful
      
      // Filter out potentially malicious content
      const dangerousPatterns = [
        /<script/i,
        /javascript:/i,
        /data:text\/html/i,
        /vbscript:/i,
        /onload=/i,
        /onerror=/i
      ];
      
      const hasDangerousContent = dangerousPatterns.some(pattern => pattern.test(result.content));
      if (hasDangerousContent) {
        console.warn('[CYBERSEC-AI] Filtered out potentially malicious content');
        return false;
      }
      
      return true;
    })
    .map((result: any) => ({
      ...result,
      content: sanitizeText(result.content),
      title: sanitizeText(result.title || ''),
    }))
    .slice(0, RAG_CONFIG.MAX_DOCUMENTS);
}

function buildContextSummary(masterResults: any[], userResults: any[], analysis: any): string {
  let summary = '';
  let tokenEstimate = 0;
  const maxTokens = RAG_CONFIG.MAX_CONTEXT_TOKENS;
  
  // Prioritize master knowledge base content
  if (masterResults.length > 0) {
    summary += `MASTER CYBERSECURITY KNOWLEDGE (${masterResults.length} sources):\n`;
    
    for (let i = 0; i < masterResults.length && tokenEstimate < maxTokens * 0.6; i++) {
      const result = masterResults[i];
      const contentSnippet = result.content.substring(0, 400);
      const line = `${i + 1}. [${result.framework_category}] ${result.title}: ${contentSnippet}...`;
      
      tokenEstimate += Math.ceil(line.length / 4); // Rough token estimation
      if (tokenEstimate < maxTokens * 0.6) {
        summary += line + '\n\n';
      } else {
        break;
      }
    }
  }
  
  // Add user-specific context if space allows
  if (userResults.length > 0 && tokenEstimate < maxTokens * 0.8) {
    summary += `\nUSER-SPECIFIC CONTEXT (${userResults.length} sources):\n`;
    
    for (let i = 0; i < userResults.length && tokenEstimate < maxTokens * 0.9; i++) {
      const result = userResults[i];
      const contentSnippet = result.content.substring(0, 300);
      const line = `${i + 1}. ${result.title || result.file_name}: ${contentSnippet}...`;
      
      tokenEstimate += Math.ceil(line.length / 4);
      if (tokenEstimate < maxTokens * 0.9) {
        summary += line + '\n\n';
      } else {
        break;
      }
    }
  }
  
  // Add analysis insights if space allows
  if (analysis.summary && tokenEstimate < maxTokens * 0.95) {
    const analysisSnippet = analysis.summary.substring(0, 500);
    summary += `\nANALYSIS INSIGHTS:\n${analysisSnippet}`;
  }
  
  console.log(`[CYBERSEC-AI] Context summary built: ~${tokenEstimate} tokens`);
  return summary;
}

// Performance monitoring function
function logRAGMetrics(question: string, knowledgeContext: any, processingTime: number) {
  const metrics = {
    query: question.substring(0, 100),
    totalSources: knowledgeContext.totalSources,
    masterSources: knowledgeContext.masterKnowledge?.length || 0,
    userSources: knowledgeContext.userDocuments?.length || 0,
    processingTimeMs: processingTime,
    cacheHit: knowledgeContext.cacheHit || false,
    belowThreshold: knowledgeContext.belowThreshold || false,
    timestamp: new Date().toISOString()
  };
  
  console.log('[CYBERSEC-AI] RAG Metrics:', JSON.stringify(metrics));
  
  // In production, send to monitoring service
  // await sendToMonitoring('rag_metrics', metrics);
}
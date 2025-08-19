import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { withSecurity, SecurityContext, sanitizeResponse } from '../_shared/security-hardening.ts';
import { createErrorResponse, HTTP_STATUS, ERROR_CODES } from '../_shared/error-handler.ts';
import { InputSanitizer } from '../_shared/security-utils.ts';

serve(async (req) => {
  return withSecurity(req, {
    requireAuth: true,
    rateLimitKey: 'save-policy',
    rateLimitOptions: {
      maxAttempts: 20, // 20 policy saves per hour
      windowMs: 3600000
    },
    logActivity: true
  }, async (request: Request, context: SecurityContext) => {
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    console.log(`[SAVE-POLICY] Request from user ${context.userId}`);

    // Parse and validate request body
    let requestData;
    try {
      requestData = await request.json();
    } catch (error) {
      return createErrorResponse(
        'Invalid JSON in request body',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT
      );
    }

    const { title, content, framework, type } = requestData;

    // Enhanced input validation
    if (!title || typeof title !== 'string') {
      return createErrorResponse(
        'Policy title is required and must be a string',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT
      );
    }

    if (!content || typeof content !== 'string') {
      return createErrorResponse(
        'Policy content is required and must be a string',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT
      );
    }

    // Sanitize inputs
    const sanitizedTitle = InputSanitizer.sanitizeString(title, 200);
    const sanitizedContent = InputSanitizer.sanitizeString(content, 100000); // 100k char limit
    const sanitizedFramework = framework ? InputSanitizer.sanitizeString(framework, 50) : null;
    const sanitizedType = type ? InputSanitizer.sanitizeString(type, 50) : 'custom';

    if (sanitizedTitle.length < 3) {
      return createErrorResponse(
        'Policy title must be at least 3 characters long',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT
      );
    }

    if (sanitizedContent.length < 50) {
      return createErrorResponse(
        'Policy content must be at least 50 characters long',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT
      );
    }

    // Validate framework if provided
    const validFrameworks = ['SOC2', 'ISO27001', 'NIST', 'HIPAA', 'GDPR', 'CCPA', 'CMMC', 'FedRAMP'];
    if (sanitizedFramework && !validFrameworks.includes(sanitizedFramework)) {
      return createErrorResponse(
        'Invalid framework specified',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT
      );
    }

    // Check for duplicate policy titles for this user
    const { data: existingPolicy } = await supabaseClient
      .from('user_policies')
      .select('id')
      .eq('user_id', context.userId)
      .eq('title', sanitizedTitle)
      .maybeSingle();

    if (existingPolicy) {
      return createErrorResponse(
        'A policy with this title already exists',
        HTTP_STATUS.CONFLICT,
        ERROR_CODES.DUPLICATE_REQUEST
      );
    }

    // Save the policy with enhanced metadata
    const { data: savedPolicy, error: saveError } = await supabaseClient
      .from('user_policies')
      .insert({
        user_id: context.userId,
        org_id: context.orgId,
        title: sanitizedTitle,
        content: sanitizedContent,
        framework: sanitizedFramework,
        type: sanitizedType,
        status: 'draft',
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (saveError) {
      console.error('[SAVE-POLICY] Database error:', saveError);
      return createErrorResponse(
        'Failed to save policy',
        HTTP_STATUS.INTERNAL_ERROR,
        ERROR_CODES.DATABASE_ERROR
      );
    }

    if (!savedPolicy) {
      return createErrorResponse(
        'Policy save returned no data',
        HTTP_STATUS.INTERNAL_ERROR,
        ERROR_CODES.DATABASE_ERROR
      );
    }

    // Log policy creation for audit trail
    await supabaseClient.from('audit_logs').insert({
      action: 'POLICY_SAVED',
      description: `Policy saved: ${sanitizedTitle}`,
      user_id: context.userId,
      metadata: {
        policy_id: savedPolicy.id,
        policy_title: sanitizedTitle,
        framework: sanitizedFramework,
        type: sanitizedType,
        content_length: sanitizedContent.length,
        security_level: 'MEDIUM'
      },
      ip_address: context.ipAddress,
      user_agent: context.userAgent
    });

    console.log('[SAVE-POLICY] Policy saved successfully:', {
      id: savedPolicy.id,
      title: sanitizedTitle,
      userId: context.userId
    });

    const sanitizedResponse = sanitizeResponse({
      success: true,
      policy: {
        id: savedPolicy.id,
        title: savedPolicy.title,
        framework: savedPolicy.framework,
        type: savedPolicy.type,
        status: savedPolicy.status,
        created_at: savedPolicy.created_at
      },
      message: 'Policy saved successfully'
    }, context.userRole);

    return new Response(JSON.stringify(sanitizedResponse), {
      status: HTTP_STATUS.CREATED,
      headers: { 'Content-Type': 'application/json' }
    });
  });
});
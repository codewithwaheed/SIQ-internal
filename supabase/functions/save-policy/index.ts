import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { withSecurity, SecurityContext, sanitizeResponse } from '../_shared/security-hardening.ts';
import { createErrorResponse, HTTP_STATUS, ERROR_CODES } from '../_shared/error-handler.ts';
import { InputSanitizer } from '../_shared/security-utils.ts';

serve(async (req) => {
  return withSecurity(
    req,
    {
      requireAuth: true,
      rateLimitKey: 'save-policy',
      rateLimitOptions: {
        maxAttempts: 20, // 20 policy saves per hour
        windowMs: 3600000,
      },
      logActivity: true,
    },
    async (request: Request, context: SecurityContext) => {
      // Initialize Supabase client
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        { auth: { persistSession: false } },
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
          ERROR_CODES.INVALID_INPUT,
        );
      }

      const { title, content, policyType, templateUsed, metadata } = requestData;

      // Enhanced input validation
      if (!title || typeof title !== 'string') {
        return createErrorResponse(
          'Policy title is required and must be a string',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INVALID_INPUT,
        );
      }

      if (!content || typeof content !== 'string') {
        return createErrorResponse(
          'Policy content is required and must be a string',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INVALID_INPUT,
        );
      }

      // Sanitize inputs
      const sanitizedTitle = InputSanitizer.sanitizeString(title, 200);
      // Preserve newlines/markdown for policy body while sanitizing dangerous content
      const sanitizedContent = InputSanitizer.sanitizePolicyContent(content, 200000);
      const sanitizedPolicyType = policyType ? InputSanitizer.sanitizeString(policyType, 60) : 'custom';
      const sanitizedTemplateUsed = templateUsed ? InputSanitizer.sanitizeString(templateUsed, 120) : null;

      if (sanitizedTitle.length < 3) {
        return createErrorResponse(
          'Policy title must be at least 3 characters long',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INVALID_INPUT,
        );
      }

      if (sanitizedContent.length < 50) {
        return createErrorResponse(
          'Policy content must be at least 50 characters long',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INVALID_INPUT,
        );
      }

      // Ensure unique title per user by auto-suffixing duplicates instead of failing
      let finalTitle = sanitizedTitle;
      try {
        const { data: duplicates } = await supabaseClient
          .from('policies')
          .select('title')
          .eq('user_id', context.userId)
          .ilike('title', `${sanitizedTitle}%`);
        if (duplicates && duplicates.length > 0) {
          // Gather existing suffix numbers
          let maxN = 1;
          for (const row of duplicates) {
            const t = String(row.title);
            if (t === sanitizedTitle) {
              maxN = Math.max(maxN, 2);
            } else {
              const m = t.match(new RegExp(`^${sanitizedTitle.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*\\((\\d+)\\)$`));
              if (m) {
                const n = parseInt(m[1], 10);
                if (!Number.isNaN(n)) maxN = Math.max(maxN, n + 1);
              }
            }
          }
          if (maxN > 1) finalTitle = `${sanitizedTitle} (${maxN})`;
        }
      } catch (_) {
        // If we can't check duplicates, proceed with original title
      }

      // Save the policy with enhanced metadata
      const { data: savedPolicy, error: saveError } = await supabaseClient
        .from('policies')
        .insert({
          user_id: context.userId,
          org_id: context.orgId,
          title: finalTitle,
          policy_type: sanitizedPolicyType,
          content: sanitizedContent,
          template_used: sanitizedTemplateUsed,
          metadata: metadata && typeof metadata === 'object' ? metadata : null,
        })
        .select()
        .single();

      if (saveError) {
        console.error('[SAVE-POLICY] Database error:', saveError);
        return createErrorResponse(
          'Failed to save policy',
          HTTP_STATUS.INTERNAL_ERROR,
          ERROR_CODES.DATABASE_ERROR,
        );
      }

      if (!savedPolicy) {
        return createErrorResponse(
          'Policy save returned no data',
          HTTP_STATUS.INTERNAL_ERROR,
          ERROR_CODES.DATABASE_ERROR,
        );
      }

      // Log policy creation for audit trail
      await supabaseClient.from('audit_logs').insert({
        action: 'POLICY_SAVED',
        description: `Policy saved: ${finalTitle}`,
        user_id: context.userId,
        metadata: {
          policy_id: savedPolicy.id,
          policy_title: finalTitle,
          policy_type: sanitizedPolicyType,
          content_length: sanitizedContent.length,
          security_level: 'MEDIUM',
        },
        ip_address: context.ipAddress,
        user_agent: context.userAgent,
      });

      console.log('[SAVE-POLICY] Policy saved successfully:', {
        id: savedPolicy.id,
        title: sanitizedTitle,
        userId: context.userId,
      });

      const sanitizedResponse = sanitizeResponse(
        {
          success: true,
          policy: {
            id: savedPolicy.id,
            title: savedPolicy.title,
            type: savedPolicy.policy_type,
            created_at: savedPolicy.created_at,
          },
          message: 'Policy saved successfully',
        },
        context.userRole,
      );

      return new Response(JSON.stringify(sanitizedResponse), {
        status: HTTP_STATUS.CREATED,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  );
});

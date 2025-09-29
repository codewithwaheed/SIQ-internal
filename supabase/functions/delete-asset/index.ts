import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { withSecurity, SecurityContext } from '../_shared/security-hardening.ts';
import { createErrorResponse, HTTP_STATUS, ERROR_CODES } from '../_shared/error-handler.ts';

serve((req) =>
  withSecurity(
    req,
    { requireAuth: true, rateLimitKey: 'delete-asset', logActivity: true },
    async (_request: Request, context: SecurityContext) => {
      let body: { assetId?: string } = {};
      try {
        body = (await req.json()) as { assetId?: string };
      } catch (_) {
        return createErrorResponse('Invalid JSON', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_INPUT);
      }
      const assetId = (body.assetId || '').trim();
      if (!assetId) {
        return createErrorResponse('assetId is required', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_INPUT);
      }

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        { auth: { persistSession: false } },
      );

      // Fetch asset, verify ownership, and get path
      const { data: asset, error } = await supabase
        .from('assets')
        .select('id, user_id, file_path')
        .eq('id', assetId)
        .single();
      if (error || !asset) {
        return createErrorResponse('Asset not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
      }
      if (asset.user_id !== context.userId) {
        return createErrorResponse('Forbidden', HTTP_STATUS.FORBIDDEN, ERROR_CODES.UNAUTHORIZED);
      }

      // Remove from storage
      try {
        await supabase.storage.from('user-images').remove([asset.file_path]);
      } catch (e) {
        console.warn('[delete-asset] storage remove warn:', e);
      }

      // Delete DB row
      const { error: delErr } = await supabase.from('assets').delete().eq('id', assetId);
      if (delErr) {
        return createErrorResponse('Failed to delete asset', HTTP_STATUS.INTERNAL_ERROR, ERROR_CODES.DATABASE_ERROR);
      }

      return new Response(JSON.stringify({ success: true, id: assetId }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  ),
);


import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { withSecurity, SecurityContext } from '../_shared/security-hardening.ts';
import { createErrorResponse, HTTP_STATUS, ERROR_CODES } from '../_shared/error-handler.ts';

type DeleteBody = { documentId?: string };

serve((req) =>
  withSecurity(
    req,
    { requireAuth: true, rateLimitKey: 'delete-document', logActivity: true },
    async (_request: Request, context: SecurityContext) => {
      let body: DeleteBody = {};
      try {
        body = (await req.json()) as DeleteBody;
      } catch (_) {
        return createErrorResponse('Invalid JSON', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_INPUT);
      }

      const documentId = (body.documentId || '').trim();
      if (!documentId) {
        return createErrorResponse('documentId is required', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_INPUT);
      }

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        { auth: { persistSession: false } },
      );

      // Verify ownership and get storage path
      const { data: doc, error: fetchErr } = await supabase
        .from('documents')
        .select('id, user_id, file_path')
        .eq('id', documentId)
        .single();
      if (fetchErr || !doc) {
        return createErrorResponse('Document not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
      }
      if (doc.user_id !== context.userId) {
        return createErrorResponse('Forbidden', HTTP_STATUS.FORBIDDEN, ERROR_CODES.UNAUTHORIZED);
      }

      // Best-effort: remove storage
      if (doc.file_path) {
        try {
          await supabase.storage.from('user-documents').remove([doc.file_path]);
        } catch (e) {
          console.warn('[delete-document] storage remove warn:', e);
        }
      }

      // Delete DB row
      const { error: delErr } = await supabase.from('documents').delete().eq('id', documentId);
      if (delErr) {
        return createErrorResponse(
          'Failed to delete document record',
          HTTP_STATUS.INTERNAL_ERROR,
          ERROR_CODES.DATABASE_ERROR,
        );
      }

      return new Response(JSON.stringify({ success: true, id: documentId }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  ),
);

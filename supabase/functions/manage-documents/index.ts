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
      rateLimitKey: 'manage-documents',
      rateLimitOptions: {
        maxAttempts: 30, // 30 requests per window
        windowMs: 60000, // 1 minute
      },
      logActivity: true,
    },
    async (request: Request, context: SecurityContext) => {
      const url = new URL(request.url);

      // Initialize Supabase client
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        { auth: { persistSession: false } },
      );

      console.log(`[MANAGE-DOCUMENTS] ${request.method} request from user ${context.userId}`);

      if (request.method === 'GET') {
        // List all documents for the user with enhanced filtering
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100); // Cap at 100
        const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0);
        const processingStatus = InputSanitizer.sanitizeString(
          url.searchParams.get('status') || '',
          50,
        );

        let query = supabaseClient
          .from('documents')
          .select(
            `
          id,
          file_name,
          file_type,
          file_size,
          processing_status,
          uploaded_at,
          processed_at,
          tags
        `,
          )
          .eq('user_id', context.userId)
          .order('uploaded_at', { ascending: false });

        if (
          processingStatus &&
          ['pending', 'processing', 'completed', 'failed'].includes(processingStatus)
        ) {
          query = query.eq('processing_status', processingStatus);
        }

        query = query.range(offset, offset + limit - 1);

        const { data: documents, error: listError } = await query;

        if (listError) {
          console.error('Failed to retrieve documents:', listError);
          return createErrorResponse(
            'Failed to retrieve documents',
            HTTP_STATUS.INTERNAL_ERROR,
            ERROR_CODES.DATABASE_ERROR,
          );
        }

        // Get total count for pagination
        const { count } = await supabaseClient
          .from('documents')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', context.userId);

        // Format documents with sanitized metadata
        const formattedDocs = (documents || []).map((doc) => ({
          ...doc,
          file_size_mb: (doc.file_size / (1024 * 1024)).toFixed(2),
          has_extracted_text: !!doc.content_extracted,
        }));

        const response = sanitizeResponse(
          {
            success: true,
            documents: formattedDocs,
            pagination: {
              limit,
              offset,
              total: count || 0,
              hasMore: (count || 0) > offset + limit,
            },
            summary: {
              total_documents: count || 0,
              processing_status_counts: {
                completed:
                  documents?.filter((d) => d.processing_status === 'completed').length || 0,
                pending: documents?.filter((d) => d.processing_status === 'pending').length || 0,
                failed: documents?.filter((d) => d.processing_status === 'failed').length || 0,
              },
            },
          },
          context.userRole,
        );

        return new Response(JSON.stringify(response), {
          headers: { 'Content-Type': 'application/json' },
          status: HTTP_STATUS.OK,
        });
      }

      // For other methods, get document ID from URL with validation
      const pathParts = url.pathname.split('/');
      const documentId = pathParts[pathParts.length - 1];

      if (!documentId || !InputSanitizer.isValidUUID(documentId)) {
        return createErrorResponse(
          'Invalid document ID format',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INVALID_INPUT,
        );
      }

      // Verify user owns this document
      const { data: document, error: verifyError } = await supabaseClient
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .eq('user_id', context.userId)
        .single();

      if (verifyError) {
        if (verifyError.code === 'PGRST116') {
          return createErrorResponse(
            'Document not found or access denied',
            HTTP_STATUS.NOT_FOUND,
            ERROR_CODES.NOT_FOUND,
          );
        }
        return createErrorResponse(
          'Failed to verify document ownership',
          HTTP_STATUS.INTERNAL_ERROR,
          ERROR_CODES.DATABASE_ERROR,
        );
      }

      if (request.method === 'DELETE') {
        // Delete document and file from storage

        // First delete the file from storage
        const { error: storageError } = await supabaseClient.storage
          .from('user-documents')
          .remove([document.file_path]);

        if (storageError) {
          console.warn('Failed to delete file from storage:', storageError.message);
        }

        // Then delete the document record
        const { error: deleteError } = await supabaseClient
          .from('documents')
          .delete()
          .eq('id', documentId)
          .eq('user_id', context.userId);

        if (deleteError) {
          return createErrorResponse(
            'Failed to delete document',
            HTTP_STATUS.INTERNAL_ERROR,
            ERROR_CODES.DATABASE_ERROR,
          );
        }

        // Log document deletion
        await supabaseClient.from('audit_logs').insert({
          action: 'DOCUMENT_DELETED',
          description: `Document deleted: ${document.file_name}`,
          user_id: context.userId,
          metadata: {
            document_id: documentId,
            file_name: document.file_name,
            file_size: document.file_size,
            security_level: 'MEDIUM',
          },
          ip_address: context.ipAddress,
          user_agent: context.userAgent,
        });

        console.log(`Document deleted: ${documentId} by user ${context.userId}`);

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Document deleted successfully',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: HTTP_STATUS.OK,
          },
        );
      }

      if (request.method === 'POST') {
        // Reprocess document (re-extract text)

        if (!document.file_path) {
          return createErrorResponse(
            'Document file path not found',
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.INVALID_INPUT,
          );
        }

        // Check if already processing
        if (document.processing_status === 'processing') {
          return createErrorResponse(
            'Document is already being processed',
            HTTP_STATUS.CONFLICT,
            ERROR_CODES.INVALID_STATE,
          );
        }

        // Update status to processing
        const { error: updateError } = await supabaseClient
          .from('documents')
          .update({
            processing_status: 'processing',
            processed_at: new Date().toISOString(),
          })
          .eq('id', documentId);

        if (updateError) {
          return createErrorResponse(
            'Failed to update document status',
            HTTP_STATUS.INTERNAL_ERROR,
            ERROR_CODES.DATABASE_ERROR,
          );
        }

        // Log reprocessing request
        await supabaseClient.from('audit_logs').insert({
          action: 'DOCUMENT_REPROCESSING',
          description: `Document reprocessing started: ${document.file_name}`,
          user_id: context.userId,
          metadata: {
            document_id: documentId,
            file_name: document.file_name,
            security_level: 'LOW',
          },
          ip_address: context.ipAddress,
          user_agent: context.userAgent,
        });

        console.log(`Document reprocessing started: ${documentId} by user ${context.userId}`);

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Document reprocessing started',
            document_id: documentId,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: HTTP_STATUS.OK,
          },
        );
      }

      return createErrorResponse(
        `Method ${request.method} not allowed`,
        HTTP_STATUS.METHOD_NOT_ALLOWED,
        ERROR_CODES.INVALID_INPUT,
      );
    },
  );
});

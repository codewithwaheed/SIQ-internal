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
      rateLimitKey: 'upload-document',
      rateLimitOptions: {
        maxAttempts: 10, // 10 uploads per hour to prevent abuse
        windowMs: 3600000, // 1 hour
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

      console.log(`[UPLOAD-DOCUMENT] Upload started by user ${context.userId}`);

      // Parse form data with size limits
      let formData;
      try {
        formData = await request.formData();
      } catch (error) {
        return createErrorResponse(
          'Invalid form data or request too large',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INVALID_INPUT,
        );
      }

      const file = formData.get('file') as File;
      const tagsJson = formData.get('tags') as string;
      const providedConversationId = formData.get('conversation_id') as string;
      const existingConversationId = formData.get('conversationId') as string | null;

      if (!file) {
        return createErrorResponse(
          'No file provided in upload request',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INVALID_INPUT,
        );
      }

      // Enhanced file validation with security checks
      const allowedTypes = [
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      const maxSize = 50 * 1024 * 1024; // 50MB max size
      const minSize = 1; // 1 byte minimum

      // Comprehensive file validation
      const validation = InputSanitizer.validateFile(file.name, file.size, file.type);
      if (!validation.isValid) {
        return createErrorResponse(
          validation.reason || 'File validation failed',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INVALID_INPUT,
        );
      }

      if (!allowedTypes.includes(file.type)) {
        return createErrorResponse(
          'File type not supported. Only PDF, TXT, DOC, and DOCX files are allowed.',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INVALID_INPUT,
        );
      }

      if (file.size > maxSize) {
        return createErrorResponse(
          'File too large. Maximum size is 50MB.',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INVALID_INPUT,
        );
      }

      if (file.size < minSize) {
        return createErrorResponse(
          'File is empty or corrupted.',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INVALID_INPUT,
        );
      }

      // Parse and validate tags
      let tags: string[] = [];
      if (tagsJson) {
        try {
          const parsedTags = JSON.parse(tagsJson);
          if (Array.isArray(parsedTags)) {
            // Sanitize and validate tags
            tags = parsedTags
              .filter((tag) => typeof tag === 'string')
              .map((tag) => InputSanitizer.sanitizeString(tag.trim(), 50))
              .filter((tag) => tag.length > 0 && tag.length <= 50)
              .slice(0, 10); // Limit number of tags
          }
        } catch (error) {
          console.warn('Invalid tags format, ignoring tags');
        }
      }

      // Enhanced filename sanitization for security
      const sanitizedFileName = InputSanitizer.sanitizeFilename(file.name);

      if (sanitizedFileName !== file.name) {
        console.log('Filename sanitized for security:', {
          original: file.name,
          sanitized: sanitizedFileName,
        });
      }

      // Magic byte validation for security
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      if (file.type === 'application/pdf') {
        const pdfHeader = [0x25, 0x50, 0x44, 0x46]; // %PDF
        if (bytes.length < 4 || !pdfHeader.every((byte, index) => bytes[index] === byte)) {
          return createErrorResponse(
            'Invalid PDF file format - file may be corrupted or not a valid PDF',
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.INVALID_INPUT,
          );
        }
      }

      // Generate secure file path
      const fileExt = sanitizedFileName.split('.').pop() || 'unknown';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${context.userId}/${fileName}`;

      // Ensure storage bucket exists (self-healing if migrations not applied)
      try {
        const { data: bucketInfo } = await (supabaseClient as any).storage.getBucket(
          'user-documents',
        );
        if (!bucketInfo) {
          await (supabaseClient as any).storage.createBucket('user-documents', { public: false });
        }
      } catch (_) {
        // ignore; will surface on upload failure
      }

      // Upload file to storage with additional security headers
      let uploadError: any = null;
      let uploadData: any = null;
      {
        const res = await supabaseClient.storage.from('user-documents').upload(filePath, file, {
          cacheControl: '3600',
          upsert: false, // Don't allow overwrites
        });
        uploadData = (res as any).data;
        uploadError = (res as any).error;
      }

      // If bucket was missing, try to create and retry once
      if (uploadError && String(uploadError?.message || uploadError).includes('Bucket not found')) {
        try {
          await (supabaseClient as any).storage.createBucket('user-documents', { public: false });
          const res2 = await supabaseClient.storage
            .from('user-documents')
            .upload(filePath, file, { cacheControl: '3600', upsert: false });
          uploadData = (res2 as any).data;
          uploadError = (res2 as any).error;
        } catch (_) {
          // keep original error path
        }
      }

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        return createErrorResponse(
          'Failed to upload file to storage',
          HTTP_STATUS.INTERNAL_ERROR,
          ERROR_CODES.UPLOAD_ERROR,
        );
      }

      // Extract text content with enhanced security
      let contentExtracted = '';
      let processingStatus = 'pending';

      try {
        if (file.type === 'text/plain') {
          // Sanitize text content to prevent XSS
          const rawText = await file.text();
          contentExtracted = InputSanitizer.sanitizeString(rawText, 50000); // 50k char limit
          // Mark as pending; indexing still needs to run
          processingStatus = 'pending';
          console.log('Extracted and sanitized plain text:', {
            length: contentExtracted.length,
          });
        } else if (file.type === 'application/pdf') {
          // Enhanced PDF text extraction with security measures
          const decoder = new TextDecoder('latin1');
          let text = decoder.decode(bytes);

          try {
            // Extract text content using secure PDF parsing
            const textMatches = text.match(/BT\s*.*?ET/gs) || [];
            let extractedText = '';

            for (const match of textMatches) {
              // Secure text extraction - remove PDF operators
              const cleanText = match
                .replace(/BT|ET|Tf|Td|Tj|TJ|'/g, ' ')
                .replace(/\[|\]|\(|\)/g, ' ')
                .replace(/[0-9]+\.?[0-9]*\s+[0-9]+\.?[0-9]*\s+/g, ' ')
                .replace(/\/\w+/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();

              if (cleanText.length > 10) {
                extractedText += cleanText + ' ';
              }
            }

            // Fallback extraction if specific method fails
            if (extractedText.length < 100) {
              extractedText = text
                .replace(/[\x00-\x1F\x7F-\xFF]/g, ' ')
                .replace(/[^\w\s\.\,\!\?\-\:\;]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            }

            if (extractedText.length > 100) {
              contentExtracted = InputSanitizer.sanitizeString(extractedText, 50000);
              // Mark as pending; indexing still needs to run
              processingStatus = 'pending';
              console.log('Enhanced PDF text extracted and sanitized:', {
                length: contentExtracted.length,
              });
            } else {
              contentExtracted = `PDF document: ${sanitizedFileName} (Text extraction pending)`;
              processingStatus = 'pending';
            }
          } catch (error) {
            console.warn('PDF text extraction error:', error.message);
            contentExtracted = `PDF document: ${sanitizedFileName} (Text extraction failed)`;
            processingStatus = 'failed';
          }
        } else {
          // Handle other document types
          contentExtracted = `Document: ${sanitizedFileName} (Type: ${file.type})`;
          processingStatus = 'pending';
        }
      } catch (extractError) {
        console.error('Text extraction error:', extractError);
        contentExtracted = `Document: ${sanitizedFileName} (Text extraction failed)`;
        processingStatus = 'failed';
      }

      // Save document metadata to database with enhanced security
      const { data: docData, error: docError } = await supabaseClient
        .from('documents')
        .insert({
          user_id: context.userId,
          org_id: context.orgId,
          file_name: sanitizedFileName,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          content_extracted: contentExtracted,
          processing_status: processingStatus,
          tags: tags.length > 0 ? tags : null,
          is_encrypted: false, // Mark as not encrypted for now
          conversation_id: providedConversationId || null, // Link to conversation if provided
        })
        .select()
        .single();

      if (docError) {
        console.error('Database insert error:', docError);
        // Clean up uploaded file if database insert fails
        await supabaseClient.storage.from('user-documents').remove([filePath]);

        return createErrorResponse(
          'Failed to save document metadata',
          HTTP_STATUS.INTERNAL_ERROR,
          ERROR_CODES.DATABASE_ERROR,
        );
      }

      // Log document upload for security auditing
      // await supabaseClient.from('audit_logs').insert({
      //   action: 'DOCUMENT_UPLOADED',
      //   description: `Document uploaded: ${sanitizedFileName}`,
      //   user_id: context.userId,
      //   metadata: {
      //     document_id: docData.id,
      //     file_name: sanitizedFileName,
      //     file_type: file.type,
      //     file_size: file.size,
      //     processing_status: processingStatus,
      //     tags_count: tags.length,
      //     security_level: 'MEDIUM',
      //   },
      //   ip_address: context.ipAddress,
      //   user_agent: context.userAgent,
      // });

      console.log('Document uploaded successfully:', {
        id: docData.id,
        fileName: sanitizedFileName,
        size: file.size,
        type: file.type,
      });

      // Create or use existing conversation for this document
      let conversationId: string | null = providedConversationId;

      if (!conversationId) {
        // Create a new conversation if none provided
        try {
          const conversationTitle = `Document Analysis: ${sanitizedFileName.replace(/\.[^/.]+$/, '')}`;
          const { data: conversationData, error: conversationError } = await supabaseClient
            .from('chat_conversations')
            .insert({
              user_id: context.userId,
              title: conversationTitle,
              tags: ['document-upload', ...tags.slice(0, 3)],
            })
            .select()
            .single();

          if (!conversationError && conversationData) {
            conversationId = conversationData.id;
            console.log('Auto-created conversation for document:', {
              conversationId,
              documentId: docData.id,
            });
          }
        } catch (e) {
          console.warn(
            '[UPLOAD-DOCUMENT] Auto-conversation creation failed:',
            (e as Error).message,
          );
        }
      } else {
        // Verify existing conversation belongs to user
        try {
          const { data: existingConv } = await supabaseClient
            .from('chat_conversations')
            .select('id, user_id')
            .eq('id', providedConversationId)
            .eq('user_id', context.userId)
            .single();

          if (!existingConv) {
            console.warn('[UPLOAD-DOCUMENT] Invalid conversation ID provided, creating new one');
            conversationId = null; // Will create new one below
          }
        } catch (e) {
          console.warn('[UPLOAD-DOCUMENT] Conversation verification failed:', (e as Error).message);
          conversationId = null;
        }
      }

      // Note: conversation_id is already set during document insertion above

      // Do not await heavy indexing here; the client will trigger indexing
      // to keep the upload endpoint fast and responsive.

      const sanitizedResponse = sanitizeResponse(
        {
          success: true,
          document: {
            ...docData,
            file_size_mb: (docData.file_size / (1024 * 1024)).toFixed(2),
          },
          conversation_id: conversationId,
          message: 'Document uploaded successfully',
          processing_status: 'queued',
          next_action: 'client_index_start',
        },
        context.userRole,
      );

      return new Response(JSON.stringify(sanitizedResponse), {
        headers: { 'Content-Type': 'application/json' },
        status: HTTP_STATUS.CREATED,
      });
    },
  );
});

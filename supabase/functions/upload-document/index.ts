import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { withSecurity, SecurityContext, sanitizeResponse } from '../_shared/security-hardening.ts';
import { createErrorResponse, HTTP_STATUS, ERROR_CODES } from '../_shared/error-handler.ts';
import { InputSanitizer } from '../_shared/security-utils.ts';

serve(async (req) => {
  return withSecurity(req, {
    requireAuth: true,
    rateLimitKey: 'upload-document',
    rateLimitOptions: {
      maxAttempts: 10, // 10 uploads per hour to prevent abuse
      windowMs: 3600000  // 1 hour
    },
    logActivity: true
  }, async (request: Request, context: SecurityContext) => {
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
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
        ERROR_CODES.INVALID_INPUT
      );
    }

    const file = formData.get("file") as File;
    const tagsJson = formData.get("tags") as string;
    
    if (!file) {
      return createErrorResponse(
        'No file provided in upload request',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT
      );
    }

    // Enhanced file validation with security checks
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    const maxSize = 50 * 1024 * 1024; // 50MB max size
    const minSize = 1; // 1 byte minimum

    // Comprehensive file validation
    const validation = InputSanitizer.validateFile(file.name, file.size, file.type);
    if (!validation.isValid) {
      return createErrorResponse(
        validation.reason || 'File validation failed',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT
      );
    }

    if (!allowedTypes.includes(file.type)) {
      return createErrorResponse(
        'File type not supported. Only PDF, TXT, DOC, and DOCX files are allowed.',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT
      );
    }

    if (file.size > maxSize) {
      return createErrorResponse(
        'File too large. Maximum size is 50MB.',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT
      );
    }

    if (file.size < minSize) {
      return createErrorResponse(
        'File is empty or corrupted.',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT
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
            .filter(tag => typeof tag === 'string')
            .map(tag => InputSanitizer.sanitizeString(tag.trim(), 50))
            .filter(tag => tag.length > 0 && tag.length <= 50)
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
        sanitized: sanitizedFileName 
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
          ERROR_CODES.INVALID_INPUT
        );
      }
    }

    // Generate secure file path
    const fileExt = sanitizedFileName.split('.').pop() || 'unknown';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${context.userId}/${fileName}`;

    // Upload file to storage with additional security headers
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('user-documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false // Don't allow overwrites
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return createErrorResponse(
        'Failed to upload file to storage',
        HTTP_STATUS.INTERNAL_ERROR,
        ERROR_CODES.UPLOAD_ERROR
      );
    }

    // Extract text content with enhanced security
    let contentExtracted = "";
    let processingStatus = "pending";
    
    try {
      if (file.type === 'text/plain') {
        // Sanitize text content to prevent XSS
        const rawText = await file.text();
        contentExtracted = InputSanitizer.sanitizeString(rawText, 50000); // 50k char limit
        processingStatus = "completed";
        console.log("Extracted and sanitized plain text:", { length: contentExtracted.length });
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
            processingStatus = "completed";
            console.log("Enhanced PDF text extracted and sanitized:", { length: contentExtracted.length });
          } else {
            contentExtracted = `PDF document: ${sanitizedFileName} (Text extraction pending)`;
            processingStatus = "requires_processing";
          }
        } catch (error) {
          console.warn("PDF text extraction error:", error.message);
          contentExtracted = `PDF document: ${sanitizedFileName} (Text extraction failed)`;
          processingStatus = "failed";
        }
      } else {
        // Handle other document types
        contentExtracted = `Document: ${sanitizedFileName} (Type: ${file.type})`;
        processingStatus = "requires_processing";
      }
    } catch (extractError) {
      console.error("Text extraction error:", extractError);
      contentExtracted = `Document: ${sanitizedFileName} (Text extraction failed)`;
      processingStatus = "failed";
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
        is_encrypted: false // Mark as not encrypted for now
      })
      .select()
      .single();

    if (docError) {
      console.error("Database insert error:", docError);
      // Clean up uploaded file if database insert fails
      await supabaseClient.storage
        .from('user-documents')
        .remove([filePath]);
      
      return createErrorResponse(
        'Failed to save document metadata',
        HTTP_STATUS.INTERNAL_ERROR,
        ERROR_CODES.DATABASE_ERROR
      );
    }

    // Log document upload for security auditing
    await supabaseClient.from('audit_logs').insert({
      action: 'DOCUMENT_UPLOADED',
      description: `Document uploaded: ${sanitizedFileName}`,
      user_id: context.userId,
      metadata: {
        document_id: docData.id,
        file_name: sanitizedFileName,
        file_type: file.type,
        file_size: file.size,
        processing_status: processingStatus,
        tags_count: tags.length,
        security_level: 'MEDIUM'
      },
      ip_address: context.ipAddress,
      user_agent: context.userAgent
    });

    console.log("Document uploaded successfully:", {
      id: docData.id,
      fileName: sanitizedFileName,
      size: file.size,
      type: file.type
    });

    const sanitizedResponse = sanitizeResponse({
      success: true,
      document: {
        ...docData,
        file_size_mb: (docData.file_size / (1024 * 1024)).toFixed(2)
      },
      message: "Document uploaded successfully"
    }, context.userRole);

    return new Response(JSON.stringify(sanitizedResponse), {
      headers: { "Content-Type": "application/json" },
      status: HTTP_STATUS.CREATED,
    });
  });
});
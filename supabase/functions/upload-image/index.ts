import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { withSecurity, SecurityContext } from '../_shared/security-hardening.ts';
import { createErrorResponse, HTTP_STATUS, ERROR_CODES } from '../_shared/error-handler.ts';

serve((req) =>
  withSecurity(
    req,
    { requireAuth: true, rateLimitKey: 'upload-image', logActivity: true },
    async (request: Request, context: SecurityContext) => {
      // Parse form-data
      let form: FormData;
      try {
        form = await request.formData();
      } catch (_) {
        return createErrorResponse('Invalid form data', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_INPUT);
      }

      const file = form.get('file') as File | null;
      if (!file) {
        return createErrorResponse('file is required', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_INPUT);
      }

      // Validate type/size
      const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
      if (!allowed.includes(file.type)) {
        return createErrorResponse('Unsupported image type', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_INPUT);
      }
      if (file.size > 10 * 1024 * 1024) {
        return createErrorResponse('Image too large (max 10MB)', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_INPUT);
      }

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        { auth: { persistSession: false } },
      );

      // Ensure bucket exists (public for inline chat display)
      const BUCKET = 'user-images';
      try {
        const { data: bucket } = await (supabase as any).storage.getBucket(BUCKET);
        if (!bucket) {
          await (supabase as any).storage.createBucket(BUCKET, { public: true });
        }
      } catch (_) {}

      // Generate path
      const ext = (file.name.split('.').pop() || 'png').toLowerCase();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const filePath = `${context.userId}/${fileName}`;

      // Upload
      const up = await supabase.storage.from(BUCKET).upload(filePath, file, { cacheControl: '3600', upsert: false });
      if ((up as any).error) {
        return createErrorResponse('Failed to upload image', HTTP_STATUS.INTERNAL_ERROR, ERROR_CODES.UPLOAD_ERROR);
      }

      // Insert asset row
      const { data: asset, error: dbErr } = await supabase
        .from('assets')
        .insert({
          user_id: context.userId,
          org_id: context.orgId,
          kind: 'image',
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
        })
        .select()
        .single();
      if (dbErr || !asset) {
        // cleanup storage on failure
        await supabase.storage.from(BUCKET).remove([filePath]);
        return createErrorResponse('Failed to save asset', HTTP_STATUS.INTERNAL_ERROR, ERROR_CODES.DATABASE_ERROR);
      }

      // Return path and bucket; FE should compute public URL using its configured Supabase URL
      return new Response(
        JSON.stringify({ success: true, asset: { ...asset, bucket: BUCKET } }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      );
    },
  ),
);

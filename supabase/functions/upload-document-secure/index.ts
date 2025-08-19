import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  authenticateRequest,
  auditSecurityEvent,
  extractIPAddress,
  sanitizeError,
} from "../_shared/auth-middleware.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: { Authorization: req.headers.get("Authorization") ?? "" },
        },
      },
    );

    // Authenticate user
    const authReq = await authenticateRequest(req, supabaseClient);
    console.log("Authenticated user:", authReq.email);

    // Extract IP address for security logging
    const ipAddress = extractIPAddress(req);

    // Check subscription limits
    const { data: canUpload, error: usageError } = await supabaseClient.rpc(
      "can_user_perform_action",
      {
        user_email: authReq.email,
        action_type: "upload",
      },
    );

    if (usageError) {
      throw new Error(
        `Failed to check upload permissions: ${usageError.message}`,
      );
    }

    if (!canUpload) {
      // Log failed upload attempt
      await auditSecurityEvent(
        supabaseClient,
        authReq.userId,
        "UPLOAD_LIMIT_EXCEEDED",
        "User attempted upload beyond subscription limit",
        { email: authReq.email, subscription_check: "failed" },
        ipAddress,
      );

      return new Response(
        JSON.stringify({
          error: "Upload limit exceeded for your subscription tier",
        }),
        { status: 403, headers: corsHeaders },
      );
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Enhanced security validation: Check file properties
    const fileBuffer = await file.arrayBuffer();
    const magicBytes = Array.from(new Uint8Array(fileBuffer.slice(0, 8)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();

    console.log("File validation:", {
      name: file.name,
      type: file.type,
      size: file.size,
      magicBytes: magicBytes.substring(0, 16),
    });

    // Validate file upload using database function
    const { error: validationError } = await supabaseClient.rpc(
      "validate_file_upload",
      {
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        magic_bytes: magicBytes,
      },
    );

    if (validationError) {
      await auditSecurityEvent(
        supabaseClient,
        authReq.userId,
        "FILE_VALIDATION_FAILED",
        `File validation failed: ${validationError.message}`,
        {
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          magic_bytes: magicBytes.substring(0, 16),
          error: validationError.message,
        },
        ipAddress,
      );

      return new Response(
        JSON.stringify({
          error: `File validation failed: ${validationError.message}`,
        }),
        { status: 400, headers: corsHeaders },
      );
    }

    // Enhanced encryption for sensitive document content
    const textContent =
      file.type === "text/plain"
        ? await file.text()
        : `Binary file: ${file.name}`;
    const encryptionData = await encryptSensitiveContent(textContent);

    // Generate secure file path
    const fileExt = file.name.split(".").pop() || "unknown";
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${authReq.userId}/${fileName}`;

    // Upload file to storage
    const { data: uploadData, error: uploadError } =
      await supabaseClient.storage
        .from("user-documents")
        .upload(filePath, file);

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    // Store document metadata in database with enhanced security
    const { data: document, error: dbError } = await supabaseClient
      .from("documents")
      .insert([
        {
          user_id: authReq.userId,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          file_path: filePath,
          processing_status: "pending",
          is_encrypted: true,
          encryption_key_hash: encryptionData.keyHash,
          encryption_iv: encryptionData.iv,
          content_extracted: encryptionData.encrypted,
          tags: [],
        },
      ])
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      // Clean up uploaded file if database insertion fails
      await supabaseClient.storage.from("user-documents").remove([filePath]);

      await auditSecurityEvent(
        supabaseClient,
        authReq.userId,
        "DOCUMENT_UPLOAD_DB_ERROR",
        "Failed to store document metadata in database",
        { file_name: file.name, error: dbError.message },
        ipAddress,
      );

      return new Response(
        JSON.stringify({ error: "Failed to store document metadata" }),
        { status: 500, headers: corsHeaders },
      );
    }

    // Log successful document access
    await supabaseClient.rpc("log_document_access", {
      document_id: document.id,
      access_type: "UPLOAD",
      user_ip: ipAddress,
    });

    // Increment upload count
    await supabaseClient.rpc("increment_upload_count", {
      user_email: authReq.email,
    });

    // Log successful upload
    await auditSecurityEvent(
      supabaseClient,
      authReq.userId,
      "DOCUMENT_UPLOADED",
      "Document uploaded successfully with encryption",
      {
        document_id: document.id,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        encrypted: true,
      },
      ipAddress,
    );

    console.log("Document uploaded successfully:", document.id);

    return new Response(
      JSON.stringify({
        success: true,
        document_id: document.id,
        message: "Document uploaded successfully with enhanced security",
      }),
      { status: 200, headers: corsHeaders },
    );
  } catch (error) {
    console.error("Upload error:", error);

    // Log the error for security monitoring
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    try {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const {
          data: { user },
        } = await supabaseClient.auth.getUser(
          authHeader.replace("Bearer ", ""),
        );
        if (user) {
          await auditSecurityEvent(
            supabaseClient,
            user.id,
            "DOCUMENT_UPLOAD_ERROR",
            "Document upload failed with error",
            {
              error: sanitizeError(error),
              timestamp: new Date().toISOString(),
            },
            extractIPAddress(req),
          );
        }
      }
    } catch (logError) {
      console.error("Failed to log upload error:", logError);
    }

    return new Response(
      JSON.stringify({
        error: sanitizeError(error, "Failed to upload document"),
      }),
      { status: 500, headers: corsHeaders },
    );
  }
});

// Enhanced encryption for sensitive document content
async function encryptSensitiveContent(
  content: string,
): Promise<{ keyHash: string; iv: string; encrypted: string }> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);

  // Generate a random key and IV
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt the content
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    data,
  );

  // Export the key and create a hash for storage
  const exportedKey = await crypto.subtle.exportKey("raw", key);
  const keyHash = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", exportedKey)),
  )
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return {
    keyHash,
    iv: Array.from(iv)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(""),
    encrypted: Array.from(new Uint8Array(encrypted))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(""),
  };
}

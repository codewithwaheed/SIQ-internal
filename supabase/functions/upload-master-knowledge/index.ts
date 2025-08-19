import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const openAIApiKey = Deno.env.get("OPENAI_API_KEY");

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Get the JWT payload to verify admin role
    const jwt = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(jwt);

    if (authError || !user) {
      throw new Error("Invalid authentication");
    }

    // Verify admin role
    const { data: userRole, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || userRole?.role !== "admin") {
      throw new Error("Admin access required");
    }

    // Handle GET request for listing documents
    if (req.method === "GET") {
      const { data: documents, error: listError } = await supabase
        .from("master_knowledge_base")
        .select("*")
        .order("created_at", { ascending: false });

      if (listError) {
        throw new Error("Failed to fetch documents");
      }

      return new Response(
        JSON.stringify({
          success: true,
          documents: documents || [],
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Handle DELETE request for deleting documents
    if (req.method === "DELETE") {
      const url = new URL(req.url);
      const documentId = url.pathname.split("/").pop();

      if (!documentId) {
        throw new Error("Document ID is required");
      }

      console.log("Deleting document:", documentId);

      // First get the document to get the file path
      const { data: document, error: fetchError } = await supabase
        .from("master_knowledge_base")
        .select("file_path")
        .eq("id", documentId)
        .single();

      if (fetchError) {
        throw new Error("Document not found");
      }

      // Delete embeddings first (foreign key constraint)
      await supabase
        .from("master_knowledge_embeddings")
        .delete()
        .eq("master_document_id", documentId);

      // Delete the document record
      const { error: deleteError } = await supabase
        .from("master_knowledge_base")
        .delete()
        .eq("id", documentId);

      if (deleteError) {
        throw new Error("Failed to delete document from database");
      }

      // Delete the file from storage (do this last so we don't lose the file if database deletion fails)
      const { error: storageError } = await supabase.storage
        .from("user-documents")
        .remove([document.file_path]);

      if (storageError) {
        console.error("Failed to delete file from storage:", storageError);
        // Don't throw error for storage deletion failure
      }

      console.log("Document deleted successfully:", documentId);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Document deleted successfully",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Handle PATCH request for updating document status
    if (req.method === "PATCH") {
      const url = new URL(req.url);
      const documentId = url.pathname.split("/").pop();

      if (!documentId) {
        throw new Error("Document ID is required");
      }

      const { is_active } = await req.json();

      const { error: updateError } = await supabase
        .from("master_knowledge_base")
        .update({ is_active })
        .eq("id", documentId);

      if (updateError) {
        throw new Error("Failed to update document status");
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Document status updated successfully",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Handle POST request - check if it's for listing or uploading
    if (req.method === "POST") {
      const url = new URL(req.url);
      const action = url.searchParams.get("action");

      // If action=list, handle listing request
      if (action === "list") {
        const { data: documents, error: listError } = await supabase
          .from("master_knowledge_base")
          .select("*")
          .order("created_at", { ascending: false });

        if (listError) {
          throw new Error("Failed to fetch documents");
        }

        return new Response(
          JSON.stringify({
            success: true,
            documents: documents || [],
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Otherwise, handle file upload
      const formData = await req.formData();
      const file = formData.get("file") as File;
      const title = formData.get("title") as string;
      const description = formData.get("description") as string;
      const contentType = formData.get("contentType") as string;
      const frameworkCategory = formData.get("frameworkCategory") as string;
      const tags = JSON.parse((formData.get("tags") as string) || "[]");

      if (!file || !title || !contentType || !frameworkCategory) {
        throw new Error(
          "Missing required fields: file, title, contentType, frameworkCategory",
        );
      }

      console.log("Processing master knowledge upload:", {
        fileName: file.name,
        title,
        contentType,
        frameworkCategory,
      });

      // Validate file type
      const allowedTypes = [
        "application/pdf",
        "text/plain",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (!allowedTypes.includes(file.type)) {
        throw new Error(
          "File type not allowed. Supported types: PDF, TXT, DOCX",
        );
      }

      // Validate file size (50MB max)
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error("File size exceeds 50MB limit");
      }

      const fileBuffer = await file.arrayBuffer();
      const fileName = `master-knowledge/${Date.now()}-${file.name}`;

      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("user-documents")
        .upload(fileName, fileBuffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error("Failed to upload file to storage");
      }

      console.log("File uploaded successfully:", uploadData.path);

      // Insert record into master_knowledge_base table
      const { data: docRecord, error: docError } = await supabase
        .from("master_knowledge_base")
        .insert({
          title,
          description,
          content_type: contentType,
          framework_category: frameworkCategory,
          file_name: file.name,
          file_path: uploadData.path,
          file_type: file.type,
          file_size: file.size,
          tags,
          created_by: user.id,
          processing_status: "pending",
        })
        .select()
        .single();

      if (docError) {
        console.error("Database insert error:", docError);
        throw new Error("Failed to create master knowledge record");
      }

      console.log("Master knowledge record created:", docRecord.id);

      // Start background processing for text extraction and embedding generation
      EdgeRuntime.waitUntil(
        processDocument(docRecord.id, uploadData.path, file.type),
      );

      return new Response(
        JSON.stringify({
          success: true,
          documentId: docRecord.id,
          message:
            "Master knowledge document uploaded successfully. Processing in background.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // If we get here, it's an unsupported method
    throw new Error("Method not allowed");
  } catch (error) {
    console.error("Error in upload-master-knowledge function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

async function processDocument(
  documentId: string,
  filePath: string,
  fileType: string,
) {
  try {
    console.log("Starting background processing for document:", documentId);

    // Update status to processing
    await supabase
      .from("master_knowledge_base")
      .update({ processing_status: "processing" })
      .eq("id", documentId);

    // Extract text from document
    let extractedText = "";

    if (fileType === "text/plain") {
      // Download and read text file
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("user-documents")
        .download(filePath);

      if (downloadError) {
        throw new Error("Failed to download file");
      }

      extractedText = await fileData.text();
    } else {
      // For PDF and DOCX, call existing extract-text function
      const { data: extractResult, error: extractError } =
        await supabase.functions.invoke("extract-text", {
          body: { filePath, fileType },
        });

      if (extractError || !extractResult?.success) {
        throw new Error("Failed to extract text from document");
      }

      extractedText = extractResult.extractedText;
    }

    console.log("Text extracted, length:", extractedText.length);

    // Update document with extracted text
    await supabase
      .from("master_knowledge_base")
      .update({
        content_extracted: extractedText,
        processed_at: new Date().toISOString(),
      })
      .eq("id", documentId);

    // Generate embeddings for the text
    await generateMasterKnowledgeEmbeddings(documentId, extractedText);

    // Update status to completed
    await supabase
      .from("master_knowledge_base")
      .update({ processing_status: "completed" })
      .eq("id", documentId);

    console.log("Document processing completed:", documentId);
  } catch (error) {
    console.error("Error processing document:", error);

    // Update status to failed
    await supabase
      .from("master_knowledge_base")
      .update({ processing_status: "failed" })
      .eq("id", documentId);
  }
}

async function generateMasterKnowledgeEmbeddings(
  documentId: string,
  text: string,
) {
  if (!openAIApiKey) {
    throw new Error("OpenAI API key not configured");
  }

  // Split text into chunks
  const chunkSize = 1000;
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }

  console.log(`Generating embeddings for ${chunks.length} chunks`);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    try {
      // Generate embedding using OpenAI
      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openAIApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "text-embedding-ada-002",
          input: chunk,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const embeddingData = await response.json();
      const embedding = embeddingData.data[0].embedding;

      // Insert embedding into database
      await supabase.from("master_knowledge_embeddings").insert({
        master_document_id: documentId,
        chunk_text: chunk,
        chunk_index: i,
        embedding,
        metadata: {
          chunk_size: chunk.length,
          total_chunks: chunks.length,
        },
      });

      console.log(`Processed chunk ${i + 1}/${chunks.length}`);

      // Add small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error processing chunk ${i}:`, error);
      // Continue with other chunks even if one fails
    }
  }
}

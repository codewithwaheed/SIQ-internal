import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { LRUCache } from "./lib/cache.ts";
import { hashString } from "./lib/hash.ts";
import { logStep } from "./lib/log.ts";
import { callModelStream, selectModel } from "./lib/model.ts";
import { deriveTitleFromFirstMessage } from "./lib/title.ts";
import { systemPrompt } from "./lib/memory.ts";
import { retrieveContext, RetrievedChunk } from "./lib/rag.ts";
import { classifyIntent, Intent } from "./lib/intent.ts";
import { sseHeaders, streamCachedReplay } from "./lib/sse.ts";
import { generateFollowups } from "./lib/followups.ts";
import {
  corsHeaders,
  createErrorResponse,
  ERROR_CODES,
  getClientIp,
  getClientsAndUser,
  HTTP_STATUS,
  inMemoryRateLimit,
} from "./lib/utils.ts";

const responseCache = new LRUCache();

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const DEBUG_ATTACH = (Deno.env.get("DEBUG_ATTACHMENTS") || "").toLowerCase() === "1";
    const dbg = (label: string, obj?: unknown) => {
      if (!DEBUG_ATTACH) return;
      try {
        console.log(`[ATTACH-DEBUG] ${label}`, obj !== undefined ? JSON.stringify(obj) : "");
      } catch (_) {
        console.log(`[ATTACH-DEBUG] ${label}`);
      }
    };
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (
      !OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY ||
      !SUPABASE_SERVICE_ROLE_KEY
    ) {
      console.error("Missing required env vars");
      return createErrorResponse(
        "Server misconfiguration",
        HTTP_STATUS.INTERNAL_ERROR,
        ERROR_CODES.INTERNAL_ERROR,
      );
    }

    // Parse body
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return createErrorResponse(
        "Invalid JSON body",
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT,
      );
    }

    const {
      content,
      message,
      conversationId,
      title,
      activeDocuments,
      isDemo,
      preferInlineDocs,
      imageAssetIds,
    } = body as any;
    const clientProvidedConversationId = !!conversationId && typeof conversationId === 'string' && conversationId.trim() !== '';

    dbg('Incoming body', {
      conversationId,
      activeDocsCount: Array.isArray(activeDocuments) ? activeDocuments.length : 0,
      imageCount: Array.isArray(imageAssetIds) ? imageAssetIds.length : 0,
    });

    // We'll resolve desiredConversationId after auth when supabaseAdmin is available
    let desiredConversationId: string | null = conversationId || null;

    // Validate/sanitize input
    const userMessage: string | undefined = typeof content === "string"
      ? content
      : message;
    if (!userMessage || typeof userMessage !== "string") {
      return createErrorResponse(
        "Message content is required and must be a string",
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT,
      );
    }
    if (userMessage.length > 10000) {
      return createErrorResponse(
        "Message too long (max 10000 characters)",
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT,
      );
    }

    const sanitizedMessage = userMessage.replace(/\u0000/g, "").trim();
    if (!sanitizedMessage) {
      return createErrorResponse(
        "Message cannot be empty",
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT,
      );
    }

    // Auth & clients (uses incoming Authorization on anon client)
    const {
      supabaseAuth,
      supabaseAdmin,
      user,
      userRole,
      orgId,
      isAuthenticated,
    } = await getClientsAndUser(req);

    if (!isDemo && !isAuthenticated) {
      return new Response(
        JSON.stringify({
          error: "Authentication required for non-demo requests",
          status: 401,
          code: "UNAUTHORIZED",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Enforce: client must provide conversationId for non-demo requests.
    // Prevent server from creating/switching conversations implicitly.
    if (!isDemo && (!conversationId || typeof conversationId !== 'string' || conversationId.trim() === '')) {
      return new Response(
        JSON.stringify({ error: 'conversationId is required', code: 'MISSING_CONVERSATION_ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Remove implicit unification/creation at bootstrap; FE must provide conversationId

    // Rate limit by IP (in-memory best-effort; replace with DB limit if needed)
    if (!isDemo) {
      const ip = getClientIp(req) || "127.0.0.1";
      const allowed = inMemoryRateLimit(ip, 60, 60_000); // 60 req / minute
      if (!allowed) {
        return new Response(
          JSON.stringify({
            error: "Rate limit exceeded",
            code: ERROR_CODES.RATE_LIMITED,
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // Conversation bootstrap
    let conversationData: any;
    let finalTitle: string | null = null;
    let openAIConversationId: string | null = null;

    if (isDemo) {
      conversationData = { id: "demo" };
      finalTitle = "Demo Conversation";
    } else if ((desiredConversationId || conversationId) && user) {
      const { data: existingConv, error: convError } = await supabaseAdmin
        .from("chat_conversations")
        .select("*")
        .eq("id", desiredConversationId || conversationId)
        .eq("user_id", user.id)
        .single();

      if (convError || !existingConv) {
        return createErrorResponse(
          "Conversation not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.NOT_FOUND,
        );
      }
      conversationData = existingConv;
      finalTitle = conversationData.title;
      openAIConversationId = existingConv.openai_conversation_id ?? null;
      dbg('Using existing conversation', { id: conversationData.id, clientProvided: clientProvidedConversationId, hasOpenAI: !!openAIConversationId });
    } else {
      conversationData = { id: "demo" };
      finalTitle = "Demo Conversation";
    }

    // Ensure an OpenAI Conversation exists for non-demo
    async function ensureOpenAIConversation(): Promise<string | null> {
      if (isDemo) return null;
      if (openAIConversationId) return openAIConversationId;
      try {
        const createRes = await fetch(
          "https://api.openai.com/v1/conversations",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              // Optionally attach a title or metadata here
            }),
          },
        );
        if (!createRes.ok) {
          throw new Error(
            `OpenAI conversations create failed: ${createRes.status}`,
          );
        }
        const created = await createRes.json();
        const convId = created?.id as string | undefined;
        if (convId) {
          openAIConversationId = convId;
          await supabaseAdmin
            .from("chat_conversations")
            .update({
              openai_conversation_id: convId,
              updated_at: new Date().toISOString(),
            })
            .eq("id", conversationData.id);
          return convId;
        }
      } catch (e) {
        console.error("Failed to ensure OpenAI conversation:", e);
      }
      return null;
    }
    openAIConversationId = await ensureOpenAIConversation();

    // Validate and normalize attached documents (ids), cap to 3, and enforce ownership
    let attachedDocIds: string[] = [];
    let attachedDocDetails: Array<{
      id: string;
      name: string;
      type: string;
      size: number;
      uploaded_at?: string;
    }> = [];
    if (!isDemo && Array.isArray(activeDocuments)) {
      const requested = (activeDocuments as any[])
        .filter((v) => typeof v === "string")
        .slice(0, 3) as string[];
      dbg('Requested activeDocuments', { requested, conversationId: conversationData.id });
      if (requested.length > 0 && user) {
        try {
          // If the client provided a conversationId, force-bind all requested docs
          // to this conversation to avoid cross-chat mismatches.
          if (clientProvidedConversationId) {
            try {
              const { data: mapping } = await supabaseAdmin
                .from('documents')
                .select('id, conversation_id')
                .in('id', requested)
                .eq('user_id', user.id);
              const toBind = (mapping || [])
                .filter((r: any) => r.conversation_id !== conversationData.id)
                .map((r: any) => r.id);
              if (toBind.length) {
                await supabaseAdmin
                  .from('documents')
                  .update({ conversation_id: conversationData.id })
                  .in('id', toBind)
                  .eq('user_id', user.id);
                dbg('Rebound docs to client conversationId', { toBind, conversationId: conversationData.id });
              }
            } catch (e) {
              console.warn('[CHAT-WITH-AI] Failed to rebind docs to provided conversation:', e);
            }
          }
          const { data: allowed } = await supabaseAdmin
            .from("documents")
            .select("id,file_name,file_type,file_size,uploaded_at,conversation_id")
            .in("id", requested)
            .eq("user_id", user.id)
            .eq("conversation_id", conversationData.id);
          attachedDocIds = (allowed || []).map((r: any) => r.id);
          attachedDocDetails = (allowed || []).map((r: any) => ({
            id: r.id,
            name: r.file_name,
            type: r.file_type,
            size: r.file_size,
            uploaded_at: r.uploaded_at,
          }));
          if (DEBUG_ATTACH && attachedDocIds.length === 0 && requested.length > 0) {
            const { data: mapping } = await supabaseAdmin
              .from('documents')
              .select('id, conversation_id')
              .in('id', requested)
              .eq('user_id', user.id);
            dbg('Requested docs conversation mapping', { mapping, currentConversationId: conversationData.id });
          }
          dbg('Allowed docs', { attachedDocIds, count: attachedDocIds.length });
          if (requested.length && attachedDocIds.length !== requested.length) {
            console.warn(
              "[CHAT-WITH-AI] Some requested activeDocuments are not bound to this conversation; ignoring them",
            );
          }
        } catch (e) {
          console.warn(
            "Document ownership validation failed; proceeding with empty list",
          );
        }
      }
    }

    // Persist user message (non-demo)
    if (!isDemo && user) {
      await supabaseAdmin.from("chat_messages").insert({
        conversation_id: conversationData.id,
        role: "user",
        content: sanitizedMessage,
        metadata: {
          original_length: userMessage.length,
          sanitized: true,
          attached_documents: attachedDocIds.length ? attachedDocIds : null,
          attached_documents_details:
            attachedDocDetails && attachedDocDetails.length > 0
              ? attachedDocDetails
              : null,
        },
      });
      await supabaseAdmin
        .from("chat_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationData.id);
    }

    // Optionally attach selected docs to this conversation in Qdrant (so future turns can use conversation scope)
    if (!isDemo && user && attachedDocIds.length > 0) {
      try {
        await supabaseAdmin.functions.invoke("qdrant-attach", {
          body: { conversationId: conversationData.id, docIds: attachedDocIds },
        });
      } catch (e) {
        console.warn("qdrant-attach failed (non-fatal):", e);
      }
    }

    // Smart coordination with document indexing to reduce "empty context" replies
    async function getDocIndexStates(ids: string[]) {
      if (ids.length === 0) {
        return [] as Array<{
          id: string;
          processing_status?: string | null;
          index_progress?: number | null;
          index_step?: string | null;
        }>;
      }
      try {
        const { data } = await supabaseAdmin
          .from("documents")
          .select("id, processing_status, index_progress, index_step")
          .in("id", ids);
        return (data || []) as Array<{
          id: string;
          processing_status?: string | null;
          index_progress?: number | null;
          index_step?: string | null;
        }>;
      } catch (_) {
        return [] as Array<{ id: string }> as any;
      }
    }

    // If user attached docs but indexing hasn't started or is at 0%, briefly wait for first chunks
    if (!isDemo && user && attachedDocIds.length > 0) {
      const start = Date.now();
      const maxWaitMs = 4000; // up to 4s to catch first indexed batches
      // Wait until any attached doc has progress >= 10 or status completed, or until timeout
      while (Date.now() - start < maxWaitMs) {
        const states = await getDocIndexStates(attachedDocIds);
        const anyReady = states.some(
          (s) =>
            s.processing_status === "completed" ||
            (s.index_progress ?? 0) >= 10,
        );
        if (anyReady) break;
        await new Promise((r) => setTimeout(r, 400));
      }
    }

    // Decide retrieval mode based on user intent
    const intent: Intent = classifyIntent(
      sanitizedMessage,
      attachedDocIds.length,
    );
    const hasActiveDocs = attachedDocIds.length > 0;
    const retrievalMode = hasActiveDocs
      ? (intent === "doc_summary" ? "doc_scroll" : "vector")
      : null;
    const topK = intent === "doc_summary" ? 20 : 5;
    try {
      console.log(
        "[CHAT-WITH-AI] Classified intent -",
        JSON.stringify({ intent, retrievalMode, topK, userId: user?.id }),
      );
      if (!hasActiveDocs) {
        console.log(
          "[CHAT-WITH-AI] No active documents; skipping RAG and using general LLM answer",
        );
      }
    } catch {}
    logStep("Classified intent", {
      intent,
      retrievalMode,
      topK,
      userId: user.id,
    });
    // Inline-docs fast path: when a new doc is attached this turn, skip Qdrant and stream using extracted text.
    async function shouldUseInlineDocs(docIds: string[]): Promise<boolean> {
      if (!preferInlineDocs && !docIds.length) return false;
      try {
        const { data } = await supabaseAdmin
          .from("documents")
          .select("id, processing_status, index_progress, uploaded_at")
          .in("id", docIds);
        const rows = (data || []) as Array<
          {
            id: string;
            processing_status?: string | null;
            index_progress?: number | null;
          }
        >;
        // Use inline if explicitly requested OR indexing is not ready (<10%) for any attached doc
        const anyCold = rows.some((r) =>
          (r.index_progress ?? 0) < 10 ||
          (r.processing_status ?? "pending") !== "completed"
        );
        return preferInlineDocs === true || anyCold;
      } catch {
        // If we cannot determine state but user asked explicitly, honor it
        return !!preferInlineDocs;
      }
    }

    // Fetch extracted text for inline-docs path
    async function fetchInlineDocContext(
      docIds: string[],
      { maxCharsPerDoc = 12000, maxDocs = 2 }: {
        maxCharsPerDoc?: number;
        maxDocs?: number;
      } = {},
    ): Promise<string> {
      try {
        const { data } = await supabaseAdmin
          .from("documents")
          .select("id, file_name, content_extracted")
          .in("id", docIds.slice(0, maxDocs));
        const docs = (data || []) as Array<
          {
            id: string;
            file_name?: string | null;
            content_extracted?: string | null;
          }
        >;
        const parts: string[] = [];
        for (const [index, d] of docs.entries()) {
          const name = d.file_name || d.id;
          const text = (d.content_extracted || "").replace(/\s+/g, " ").trim();
          if (!text) continue;
          const limited = text.slice(0, maxCharsPerDoc);
          parts.push(
            `--- BEGIN ${name} (page window ${
              index + 1
            }) ---\n${limited}\n--- END ${name} ---`,
          );
        }
        return parts.join("\n\n");
      } catch {
        return "";
      }
    }

    const recentUploadThresholdMs = 5 * 60 * 1000;
    const now = Date.now();
    const hasFreshUpload = attachedDocDetails.some((doc) => {
      if (!doc.uploaded_at) return false;
      const uploaded = new Date(doc.uploaded_at).getTime();
      return !Number.isNaN(uploaded) &&
        now - uploaded < recentUploadThresholdMs;
    });

    const useInline = !isDemo && user && hasActiveDocs
      ? await shouldUseInlineDocs(attachedDocIds)
      : false;
    try {
      console.log(
        "[CHAT-WITH-AI] Retrieval decision",
        JSON.stringify({
          preferInlineDocs: !!preferInlineDocs,
          hasActiveDocs,
          intent,
          retrievalMode,
          useInline,
          attachedDocIdsCount: attachedDocIds.length,
        }),
      );
    } catch {}

    // Prepare short-lived signed URLs for image attachments (if provided)
    let imageSignedUrls: string[] = [];
    if (
      !isDemo && user && Array.isArray(imageAssetIds) &&
      imageAssetIds.length > 0
    ) {
      try {
        const wanted = (imageAssetIds as string[]).filter((v) =>
          typeof v === "string"
        ).slice(0, 3);
        if (wanted.length > 0) {
          const { data: assets } = await supabaseAdmin
            .from("assets")
            .select("id, user_id, file_path")
            .in("id", wanted);
          const owned = (assets || []).filter((a: any) =>
            a.user_id === user.id
          );
          const BUCKET = "user-images";
          const PUBLIC_BASE = Deno.env.get("PUBLIC_STORAGE_BASE_URL") || "";
          const rewriteBase = (url: string) => {
            if (!PUBLIC_BASE) return url;
            try {
              const original = new URL(url);
              const base = new URL(PUBLIC_BASE);
              // Replace scheme + host, and explicitly manage port
              original.protocol = base.protocol;
              original.hostname = base.hostname;
              // If base has an explicit port, use it; otherwise clear any port
              original.port = base.port || "";
              // If base has a non-root path prefix, prepend it to storage path
              const basePath = base.pathname && base.pathname !== "/"
                ? base.pathname.replace(/\/$/, "")
                : "";
              if (basePath) {
                original.pathname = `${basePath}${original.pathname}`;
              }
              console.log({ str_url: original.toString() });
              return original.toString();
            } catch {
              return url;
            }
          };

          // Give OpenAI more time to fetch: 10 minutes TTL
          const TTL_SECONDS = 600;
          for (const a of owned) {
            const { data: signed } = await supabaseAdmin.storage
              .from(BUCKET)
              .createSignedUrl(a.file_path, TTL_SECONDS, { download: false });
            if (signed?.signedUrl) {
              imageSignedUrls.push(rewriteBase(signed.signedUrl));
            }
          }
          dbg('Image signed urls count', { count: imageSignedUrls.length });
        }
      } catch (e) {
        console.warn(
          "[CHAT-WITH-AI] Failed to create signed URLs for images:",
          e,
        );
      }
    }

    // Prepare short-lived signed URLs for attached PDFs/documents (if provided)
    let docSignedUrls: string[] = [];
    if (!isDemo && user && hasActiveDocs) {
      try {
        const { data: docs } = await supabaseAdmin
          .from('documents')
          .select('id, user_id, file_path')
          .in('id', attachedDocIds.slice(0, 3));
        const ownedDocs = (docs || []).filter((d: any) => d.user_id === user.id);
        const BUCKET_DOCS = 'user-documents';
        const PUBLIC_BASE_DOCS = Deno.env.get('PUBLIC_STORAGE_BASE_URL') || '';
        const rewriteDocsBase = (url: string) => {
          if (!PUBLIC_BASE_DOCS) return url;
          try {
            const original = new URL(url);
            const base = new URL(PUBLIC_BASE_DOCS);
            original.protocol = base.protocol;
            original.hostname = base.hostname;
            original.port = base.port || '';
            const basePath = base.pathname && base.pathname !== '/' ? base.pathname.replace(/\/$/, '') : '';
            if (basePath) original.pathname = `${basePath}${original.pathname}`;
            return original.toString();
          } catch {
            return url;
          }
        };
        const TTL_SECONDS_DOCS = 600; // 10 minutes
        for (const d of ownedDocs) {
          const { data: signed } = await supabaseAdmin.storage
            .from(BUCKET_DOCS)
            .createSignedUrl(d.file_path, TTL_SECONDS_DOCS, { download: false });
          if (signed?.signedUrl) docSignedUrls.push(rewriteDocsBase(signed.signedUrl));
        }
        dbg('Doc signed urls count', { count: docSignedUrls.length, docIds: attachedDocIds });
      } catch (e) {
        console.warn('[CHAT-WITH-AI] Failed to create signed URLs for docs:', e);
      }
    }

    // RAG: retrieve relevant context chunks (skip if no active docs OR using inline-docs OR analyzing images/files)
    let citations: RetrievedChunk[] = [];
    if (
      !isDemo && user && hasActiveDocs && retrievalMode && !useInline &&
      imageSignedUrls.length === 0 && docSignedUrls.length === 0
    ) {
      citations = await retrieveContext(supabaseAdmin, {
        userId: user.id,
        conversationId: conversationData.id,
        activeDocuments: attachedDocIds,
        query: sanitizedMessage,
        topK,
        mode: retrievalMode as any,
      });
      try {
        console.log(
          "[CHAT-WITH-AI] RAG path used",
          JSON.stringify({ snippets: citations.length, topK }),
        );
      } catch {}
    }

    // Build context prompt from retrieved chunks
    const ragContext = citations.length > 0
      ? `Context snippets (cite using [file:chunk]):\n` +
        citations
          .map(
            (c, idx) =>
              `[${c.file_name || c.doc_id}:${c.chunk_id}] ${
                c.text.replace(/\s+/g, " ").trim()
              }`,
          )
          .join("\n")
      : "";

    // If using inline docs, fetch extracted text and compose as direct context
    let inlineDocContext = "";
    if (useInline) {
      const inlineOptions = {
        maxCharsPerDoc: hasFreshUpload ? 20000 : 12000,
        maxDocs: hasFreshUpload ? 3 : 2,
      };
      inlineDocContext = await fetchInlineDocContext(
        attachedDocIds,
        inlineOptions,
      );
      try {
        console.log(
          "[CHAT-WITH-AI] Inline-docs path used",
          JSON.stringify({
            docIds: attachedDocIds,
            inlineChars: inlineDocContext.length,
            preview: inlineDocContext.slice(0, 300),
          }),
        );
      } catch {}
    }

    // Build model selection; use Responses API with Conversations
    const model = selectModel();

    // --- CACHE PATH: if present, replay cached stream (now with followups + conversation_id in chunks) ---
    const cacheKey = await hashString(
      JSON.stringify({ model, openAIConversationId, prompt: sanitizedMessage }),
    );
    const cached = responseCache.get(cacheKey) as string | null;
    if (cached) {
      logStep("Cache hit");

      // build followup metadata even on cached path
      const followups = await generateFollowups(
        OPENAI_API_KEY,
        model,
        sanitizedMessage,
        cached,
      );

      // Persist assistant message on cache hit as well (non-demo)
      if (!isDemo && user) {
        try {
          await supabaseAdmin.from("chat_messages").insert({
            conversation_id: conversationData.id,
            role: "assistant",
            content: cached,
            metadata: {
              model,
              tokens: cached.length,
              suggestions: followups?.suggestions || null,
              next_actions: followups?.next_actions || null,
              framework_tags: followups?.framework_tags || null,
              risk_level: followups?.risk_level || null,
            },
          });
          await supabaseAdmin
            .from("chat_conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", conversationData.id);
        } catch (e) {
          console.error("Failed to persist cached assistant message:", e);
        }
      }

      return streamCachedReplay(
        String(cached),
        conversationData.id,
        finalTitle!,
        followups,
      );
    }

    // --- LIVE PATH: stream OpenAI to client, aggregate full text, then emit complete with followups ---
    logStep("Calling OpenAI", { model });
    // Compose instructions depending on intent and whether we have context
    const hasContext =
      (ragContext.trim().length > 0 || inlineDocContext.trim().length > 0) &&
      imageSignedUrls.length === 0 && docSignedUrls.length === 0;
    let instructions = `${systemPrompt()}`;
    // If we are analyzing attachments (images/PDFs), add a focusing directive
    if ((imageSignedUrls && imageSignedUrls.length) || (docSignedUrls && docSignedUrls.length)) {
      instructions += `\n\nAttachment Focus: The user attached files for this turn. Base your answer only on the attached items provided in this message. Do NOT use or assume context from earlier documents unless explicitly restated in this turn.`;
    }
    if (intent === "doc_summary") {
      instructions +=
        `\n\nTask: Summarize the attached document for a CISO.\n- Provide a concise, structured summary with sections: Executive summary, Key policies/controls, Requirements, Risks/Gaps, Next actions.\n- Format each section title in bold (Markdown) and include 2-3 sentences or bullet points that expand on the details.\n- Use only the provided context chunks. Cite sources like [file:chunk].`;
    } else if (intent === "compare") {
      instructions +=
        `\n\nTask: Compare attached documents.\n- Summarize similarities and differences, highlight conflicting requirements, and note risks.\n- Use only the provided context chunks. Cite sources like [file:chunk].`;
    } else if (hasContext) {
      instructions +=
        `\n\nGrounding: Answer only using the provided context.\n- If the answer is not in context, say you don't know.\n- Cite sources inline like [file:chunk].\n- Be concise and accurate.`;
    } else {
      // No context available; general helpful assistant without strict grounding
      instructions +=
        `\n\nNo document context detected this turn. Answer using your cybersecurity knowledge. If the user expects document grounding, suggest attaching or finishing indexing.`;
    }

    instructions +=
      `\n\nFormatting: Use bold Markdown headings for major sections and favor short paragraphs or bullet lists for implementation steps.`;

    const composedUserText = hasContext
      ? `${
        inlineDocContext
          ? `Inline document content:\n${inlineDocContext}\n\n`
          : ""
      }${
        ragContext ? `${ragContext}\n\n` : ""
      }User request: ${sanitizedMessage}`
      : sanitizedMessage;

    // Log a safe summary of the final prompt composition (truncated)
    try {
      console.log(
        "[CHAT-WITH-AI] Prompt composition",
        JSON.stringify({
          hasContext,
          inlineChars: inlineDocContext.length,
          ragSnippets: citations.length,
          userTextPreview: sanitizedMessage.slice(0, 200),
          composedPreview: composedUserText.slice(0, 400),
        }),
      );
    } catch {}

    dbg('Pre-model call', { hasActiveDocs, attachedDocIds, imageCount: imageSignedUrls.length, docCount: docSignedUrls.length, useInline });
    const oaRes = await callModelStream(
      OPENAI_API_KEY,
      model,
      openAIConversationId,
      composedUserText,
      instructions,
      imageSignedUrls.length ? imageSignedUrls : undefined,
      docSignedUrls.length ? docSignedUrls : undefined,
    );
    if (!oaRes.ok) {
      const errText = await oaRes.text();
      return new Response(
        JSON.stringify({
          error: `OpenAI API error (${oaRes.status}): ${errText}`,
          status: oaRes.status,
          retry_recommended: oaRes.status >= 500 || oaRes.status === 429,
        }),
        {
          status: oaRes.status >= 500 ? 500 : 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullContent = "";

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          const reader = oaRes.body?.getReader();
          if (!reader) throw new Error("No reader from OpenAI");
          // Track the DB id of the inserted assistant message so we can enrich metadata later
          let insertedMessageId: string | null = null;

          const collectFromContentArray = (items: unknown): string => {
            if (!Array.isArray(items)) return "";
            return items
              .map((item) => {
                if (!item) return "";
                if (typeof item === "string") return item;
                if (typeof item === "object") {
                  const obj = item as Record<string, unknown>;
                  if (typeof obj.text === "string") return obj.text;
                  if (Array.isArray(obj.text)) {
                    return collectFromContentArray(obj.text);
                  }
                  if (Array.isArray(obj.content)) {
                    return collectFromContentArray(obj.content);
                  }
                }
                return "";
              })
              .filter(Boolean)
              .join("");
          };

          const extractDeltaText = (event: Record<string, unknown>): string => {
            let piece = "";

            const choiceDelta = (event?.choices as any)?.[0]?.delta;
            if (choiceDelta) {
              const content = choiceDelta.content;
              if (typeof content === "string") piece += content;
              if (Array.isArray(content)) {
                piece += collectFromContentArray(content);
              }
            }

            if (!piece && typeof event.delta === "string") {
              piece += event.delta as string;
            }

            if (!piece && typeof event.delta === "object" && event.delta) {
              const deltaObj = event.delta as Record<string, unknown>;
              if (typeof deltaObj.text === "string") piece += deltaObj.text;
              if (Array.isArray(deltaObj.text)) {
                piece += collectFromContentArray(deltaObj.text);
              }
              if (Array.isArray(deltaObj.content)) {
                piece += collectFromContentArray(deltaObj.content);
              }
              if (typeof deltaObj.output_text === "string") {
                piece += deltaObj.output_text;
              }
              if (Array.isArray(deltaObj.output_text)) {
                piece += collectFromContentArray(deltaObj.output_text);
              }
            }

            if (!piece && typeof event.content === "string") {
              piece += event.content as string;
            } else if (!piece && Array.isArray(event.content)) {
              piece += collectFromContentArray(event.content as unknown[]);
            }

            if (!piece && typeof event.output_text === "string") {
              piece += event.output_text as string;
            } else if (!piece && Array.isArray(event.output_text)) {
              piece += collectFromContentArray(event.output_text as unknown[]);
            }

            return piece;
          };

          let debugLogged = 0;

          const processSsePayload = (payload: string) => {
            let piece = "";
            try {
              const parsed = JSON.parse(payload) as Record<string, unknown>;
              piece = extractDeltaText(parsed);
              if (piece) {
                fullContent += piece;
                controller.enqueue(
                  encoder.encode(
                    `data: ${
                      JSON.stringify({
                        type: "chunk",
                        content: piece,
                        conversation_id: conversationData.id,
                      })
                    }\n\n`,
                  ),
                );
              }
            } catch (err) {
              if (debugLogged < 5) {
                try {
                  console.log("[CHAT-WITH-AI] SSE parse error", payload, err);
                } catch {}
                debugLogged++;
              }
              return;
            }

            if (!piece && debugLogged < 5) {
              try {
                console.log(
                  "[CHAT-WITH-AI] Empty SSE delta interpreted",
                  payload,
                );
              } catch {}
              debugLogged++;
            }
          };

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const payload = line.slice(6).trim();
              if (payload === "[DONE]") continue;
              processSsePayload(payload);
            }
          }

          if (buffer.trim()) {
            const trailing = buffer.split("\n");
            buffer = "";
            for (const line of trailing) {
              if (!line.startsWith("data: ")) continue;
              const payload = line.slice(6).trim();
              if (payload === "[DONE]") continue;
              processSsePayload(payload);
            }
          }

          const fallbackModel = Deno.env.get("OPENAI_FALLBACK_MODEL") ??
            "gpt-4o-mini";

          const streamChatCompletionFallback = async () => {
            const fallbackRes = await fetch(
              "https://api.openai.com/v1/chat/completions",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${OPENAI_API_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: fallbackModel,
                  messages: [
                    ...(instructions
                      ? [{ role: "system", content: instructions }]
                      : []),
                    { role: "user", content: composedUserText },
                  ],
                  stream: true,
                  max_completion_tokens: 1500,
                  temperature: 0.7,
                }),
                signal: AbortSignal.timeout(120000),
              },
            );

            if (!fallbackRes.ok) {
              const errText = await fallbackRes.text().catch(() => "");
              throw new Error(
                `OpenAI Chat Completions fallback error (${fallbackRes.status}): ${errText}`,
              );
            }

            const reader2 = fallbackRes.body?.getReader();
            if (!reader2) {
              throw new Error("No reader from OpenAI chat completions");
            }

            const fallbackDecoder = new TextDecoder();
            let fbBuffer = "";

            while (true) {
              const { done: done2, value: value2 } = await reader2.read();
              if (done2) break;

              fbBuffer += fallbackDecoder.decode(value2, { stream: true });
              const lines2 = fbBuffer.split("\n");
              fbBuffer = lines2.pop() || "";

              for (const line of lines2) {
                if (!line.startsWith("data:")) continue;
                const payload = line.slice(5).trim();
                if (payload === "[DONE]") continue;
                try {
                  const parsed = JSON.parse(payload);
                  const delta = parsed?.choices?.[0]?.delta?.content;
                  let piece = "";
                  if (typeof delta === "string") {
                    piece = delta;
                  } else if (Array.isArray(delta)) {
                    piece = collectFromContentArray(delta);
                  }
                  if (piece) {
                    fullContent += piece;
                    controller.enqueue(
                      encoder.encode(
                        `data: ${
                          JSON.stringify({
                            type: "chunk",
                            content: piece,
                            conversation_id: conversationData.id,
                            client_provided_conversation_id: clientProvidedConversationId,
                          })
                        }\n\n`,
                      ),
                    );
                  }
                } catch (err) {
                  if (debugLogged < 5) {
                    try {
                      console.log(
                        "[CHAT-WITH-AI] Chat completion SSE parse error",
                        payload,
                        err,
                      );
                    } catch {}
                    debugLogged++;
                  }
                }
              }
            }

            if (fbBuffer.trim()) {
              const remaining = fbBuffer.split("\n");
              for (const line of remaining) {
                if (!line.startsWith("data:")) continue;
                const payload = line.slice(5).trim();
                if (payload === "[DONE]") continue;
                try {
                  const parsed = JSON.parse(payload);
                  const delta = parsed?.choices?.[0]?.delta?.content;
                  let piece = "";
                  if (typeof delta === "string") {
                    piece = delta;
                  } else if (Array.isArray(delta)) {
                    piece = collectFromContentArray(delta);
                  }
                  if (piece) {
                    fullContent += piece;
                    controller.enqueue(
                      encoder.encode(
                        `data: ${
                          JSON.stringify({
                            type: "chunk",
                            content: piece,
                            conversation_id: conversationData.id,
                            client_provided_conversation_id: clientProvidedConversationId,
                          })
                        }\n\n`,
                      ),
                    );
                  }
                } catch (err) {
                  if (debugLogged < 5) {
                    try {
                      console.log(
                        "[CHAT-WITH-AI] Chat completion SSE parse error",
                        payload,
                        err,
                      );
                    } catch {}
                    debugLogged++;
                  }
                }
              }
            }
          };

          if (!fullContent.trim()) {
            await streamChatCompletionFallback();
          }

          if (!fullContent.trim()) {
            const fallbackMessage =
              "I was unable to generate a response right now. Please try asking again in a moment.";
            fullContent = fallbackMessage;
            controller.enqueue(
              encoder.encode(
                `data: ${
                  JSON.stringify({
                    type: "chunk",
                    content: fallbackMessage,
                    conversation_id: conversationData.id,
                  })
                }\n\n`,
              ),
            );
          }

          // Save assistant message & cache if any content
          if (fullContent.trim()) {
            responseCache.set(cacheKey, fullContent);

            // Insert assistant message now to get an id; enrich metadata after followups
            if (!isDemo && user) {
              try {
                const { data: inserted } = await supabaseAdmin
                  .from("chat_messages")
                  .insert({
                    conversation_id: conversationData.id,
                    role: "assistant",
                    content: fullContent,
                    metadata: { model, tokens: fullContent.length },
                  })
                  .select("id")
                  .single();
                insertedMessageId = inserted?.id ?? null;
                await supabaseAdmin
                  .from("chat_conversations")
                  .update({ updated_at: new Date().toISOString() })
                  .eq("id", conversationData.id);
              } catch (e) {
                console.error("Failed to insert assistant message:", e);
              }
            }
          }

          // Build followups (server-driven suggestions/next steps). Swallow failures.
          const followups = fullContent.trim()
            ? await generateFollowups(
              OPENAI_API_KEY,
              model,
              sanitizedMessage,
              fullContent,
            )
            : {};

          // Enrich the just-inserted assistant message with followup metadata
          if (!isDemo && user) {
            try {
              if (insertedMessageId) {
                await supabaseAdmin
                  .from("chat_messages")
                  .update({
                    metadata: {
                      model,
                      tokens: fullContent.length,
                      suggestions: followups?.suggestions || null,
                      next_actions: followups?.next_actions || null,
                      framework_tags: followups?.framework_tags || null,
                      risk_level: followups?.risk_level || null,
                    },
                  })
                  .eq("id", insertedMessageId);
              }
            } catch (e) {
              console.error(
                "Failed to update assistant metadata with followups:",
                e,
              );
            }
          }

          // Final markers for FE (now with suggestions, next_actions, etc.)
          controller.enqueue(
            encoder.encode(
              `data: ${
                JSON.stringify({
                  type: "complete",
                  conversation_id: conversationData.id,
                  client_provided_conversation_id: clientProvidedConversationId,
                  title: finalTitle,
                  citations,
                  indexing: attachedDocIds.length
                    ? {
                      attached: attachedDocIds,
                      note: citations.length === 0
                        ? "indexing_pending_or_no_matches"
                        : "ok",
                    }
                    : undefined,
                  ...(followups ?? {}),
                })
              }\n\n`,
            ),
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (e) {
          controller.enqueue(
            encoder.encode(
              `data: ${
                JSON.stringify({ type: "error", error: (e as Error).message })
              }\n\n`,
            ),
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(stream, { headers: sseHeaders() });
  } catch (error) {
    console.error("Error in chat-with-ai:", error);
    return createErrorResponse(
      "AI chat service temporarily unavailable",
      HTTP_STATUS.INTERNAL_ERROR,
      ERROR_CODES.INTERNAL_ERROR,
    );
  }
});

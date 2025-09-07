import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

import { LRUCache } from './lib/cache.ts';
import { hashString } from './lib/hash.ts';
import { logStep } from './lib/log.ts';
import { selectModel, callModelStream } from './lib/model.ts';
import { deriveTitleFromFirstMessage } from './lib/title.ts';
import { systemPrompt } from './lib/memory.ts';
import { sseHeaders, streamCachedReplay } from './lib/sse.ts';
import { generateFollowups } from './lib/followups.ts';
import {
  corsHeaders,
  getClientsAndUser,
  getClientIp,
  createErrorResponse,
  HTTP_STATUS,
  ERROR_CODES,
  inMemoryRateLimit,
} from './lib/utils.ts';

const responseCache = new LRUCache();

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing required env vars');
      return createErrorResponse(
        'Server misconfiguration',
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
        'Invalid JSON body',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT,
      );
    }

    const { content, message, conversationId, title, activeDocuments, isDemo } = body;

    // Validate/sanitize input
    const userMessage: string | undefined = typeof content === 'string' ? content : message;
    if (!userMessage || typeof userMessage !== 'string') {
      return createErrorResponse(
        'Message content is required and must be a string',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT,
      );
    }
    if (userMessage.length > 10000) {
      return createErrorResponse(
        'Message too long (max 10000 characters)',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT,
      );
    }

    const sanitizedMessage = userMessage.replace(/\u0000/g, '').trim();
    if (!sanitizedMessage) {
      return createErrorResponse(
        'Message cannot be empty',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT,
      );
    }

    // Auth & clients (uses incoming Authorization on anon client)
    const { supabaseAuth, supabaseAdmin, user, userRole, orgId, isAuthenticated } =
      await getClientsAndUser(req);

    if (!isDemo && !isAuthenticated) {
      return new Response(
        JSON.stringify({
          error: 'Authentication required for non-demo requests',
          status: 401,
          code: 'UNAUTHORIZED',
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Rate limit by IP (in-memory best-effort; replace with DB limit if needed)
    if (!isDemo) {
      const ip = getClientIp(req) || '127.0.0.1';
      const allowed = inMemoryRateLimit(ip, 60, 60_000); // 60 req / minute
      if (!allowed) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded', code: ERROR_CODES.RATE_LIMITED }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    // Conversation bootstrap
    let conversationData: any;
    let finalTitle: string | null = null;
    let openAIConversationId: string | null = null;

    if (isDemo) {
      conversationData = { id: 'demo' };
      finalTitle = 'Demo Conversation';
    } else if (conversationId && user) {
      const { data: existingConv, error: convError } = await supabaseAdmin
        .from('chat_conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('user_id', user.id)
        .single();

      if (convError || !existingConv) {
        return createErrorResponse(
          'Conversation not found',
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.NOT_FOUND,
        );
      }
      conversationData = existingConv;
      finalTitle = conversationData.title;
      openAIConversationId = existingConv.openai_conversation_id ?? null;
    } else if (!isDemo && user) {
      finalTitle = (title && title.trim()) || deriveTitleFromFirstMessage(sanitizedMessage);
      const { data: newConv, error: createError } = await supabaseAdmin
        .from('chat_conversations')
        .insert({ user_id: user.id, title: finalTitle, tags: [] })
        .select()
        .single();
      if (createError || !newConv) {
        console.error('Create conversation failed', createError);
        return createErrorResponse(
          'Failed to create conversation',
          HTTP_STATUS.INTERNAL_ERROR,
          ERROR_CODES.DATABASE_ERROR,
        );
      }
      conversationData = newConv;
    } else {
      conversationData = { id: 'demo' };
      finalTitle = 'Demo Conversation';
    }

    // Ensure an OpenAI Conversation exists for non-demo
    async function ensureOpenAIConversation(): Promise<string | null> {
      if (isDemo) return null;
      if (openAIConversationId) return openAIConversationId;
      try {
        const createRes = await fetch('https://api.openai.com/v1/conversations', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            // Optionally attach a title or metadata here
          }),
        });
        if (!createRes.ok)
          throw new Error(`OpenAI conversations create failed: ${createRes.status}`);
        const created = await createRes.json();
        const convId = created?.id as string | undefined;
        if (convId) {
          openAIConversationId = convId;
          await supabaseAdmin
            .from('chat_conversations')
            .update({ openai_conversation_id: convId, updated_at: new Date().toISOString() })
            .eq('id', conversationData.id);
          return convId;
        }
      } catch (e) {
        console.error('Failed to ensure OpenAI conversation:', e);
      }
      return null;
    }
    openAIConversationId = await ensureOpenAIConversation();

    // Persist user message (non-demo)
    if (!isDemo && user) {
      await supabaseAdmin.from('chat_messages').insert({
        conversation_id: conversationData.id,
        role: 'user',
        content: sanitizedMessage,
        metadata: { original_length: userMessage.length, sanitized: true },
      });
      await supabaseAdmin
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationData.id);
    }

    // Build model selection; use Responses API with Conversations
    const model = selectModel();

    // --- CACHE PATH: if present, replay cached stream (now with followups + conversation_id in chunks) ---
    const cacheKey = await hashString(
      JSON.stringify({ model, openAIConversationId, prompt: sanitizedMessage }),
    );
    const cached = responseCache.get(cacheKey) as string | null;
    if (cached) {
      logStep('Cache hit');

      // build followup metadata even on cached path
      const followups = await generateFollowups(OPENAI_API_KEY, model, sanitizedMessage, cached);

      // Persist assistant message on cache hit as well (non-demo)
      if (!isDemo && user) {
        try {
          await supabaseAdmin.from('chat_messages').insert({
            conversation_id: conversationData.id,
            role: 'assistant',
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
            .from('chat_conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', conversationData.id);
        } catch (e) {
          console.error('Failed to persist cached assistant message:', e);
        }
      }

      return streamCachedReplay(String(cached), conversationData.id, finalTitle!, followups);
    }

    // --- LIVE PATH: stream OpenAI to client, aggregate full text, then emit complete with followups ---
    logStep('Calling OpenAI', { model });
    const oaRes = await callModelStream(
      OPENAI_API_KEY,
      model,
      openAIConversationId,
      sanitizedMessage,
      systemPrompt(),
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
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          const reader = oaRes.body?.getReader();
          if (!reader) throw new Error('No reader from OpenAI');
          // Track the DB id of the inserted assistant message so we can enrich metadata later
          let insertedMessageId: string | null = null;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value);
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const payload = line.slice(6).trim();
              if (payload === '[DONE]') continue;

              try {
                const parsed = JSON.parse(payload);
                // Handle both Chat Completions and Responses streaming formats
                let piece: string | undefined = undefined;
                // Chat Completions delta
                piece = parsed?.choices?.[0]?.delta?.content ?? piece;
                // Responses API delta
                if (!piece && typeof parsed?.type === 'string') {
                  // Common event: response.output_text.delta
                  if (parsed.type.endsWith('.delta') && typeof parsed.delta === 'string') {
                    piece = parsed.delta as string;
                  }
                  // Some implementations emit { type: 'message.delta', delta: { content: [{type:'output_text', text:'...'}] } }
                  const textFromNested = parsed?.delta?.content?.[0]?.text;
                  if (!piece && typeof textFromNested === 'string') piece = textFromNested;
                }
                if (piece) {
                  fullContent += piece;
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        type: 'chunk',
                        content: piece,
                        conversation_id: conversationData.id,
                      })}\n\n`,
                    ),
                  );
                }
              } catch {
                // ignore heartbeats/non-JSON
              }
            }
          }

          // Save assistant message & cache if any content
          if (fullContent.trim()) {
            responseCache.set(cacheKey, fullContent);

            // Insert assistant message now to get an id; enrich metadata after followups
            if (!isDemo && user) {
              try {
                const { data: inserted } = await supabaseAdmin
                  .from('chat_messages')
                  .insert({
                    conversation_id: conversationData.id,
                    role: 'assistant',
                    content: fullContent,
                    metadata: { model, tokens: fullContent.length },
                  })
                  .select('id')
                  .single();
                insertedMessageId = inserted?.id ?? null;
                await supabaseAdmin
                  .from('chat_conversations')
                  .update({ updated_at: new Date().toISOString() })
                  .eq('id', conversationData.id);
              } catch (e) {
                console.error('Failed to insert assistant message:', e);
              }
            }
          }

          // Build followups (server-driven suggestions/next steps). Swallow failures.
          const followups = fullContent.trim()
            ? await generateFollowups(OPENAI_API_KEY, model, sanitizedMessage, fullContent)
            : {};

          // Enrich the just-inserted assistant message with followup metadata
          if (!isDemo && user) {
            try {
              if (insertedMessageId) {
                await supabaseAdmin
                  .from('chat_messages')
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
                  .eq('id', insertedMessageId);
              }
            } catch (e) {
              console.error('Failed to update assistant metadata with followups:', e);
            }
          }

          // Final markers for FE (now with suggestions, next_actions, etc.)
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'complete',
                conversation_id: conversationData.id,
                title: finalTitle,
                ...(followups ?? {}),
              })}\n\n`,
            ),
          );
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (e) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'error', error: (e as Error).message })}\n\n`,
            ),
          );
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      },
    });

    return new Response(stream, { headers: sseHeaders() });
  } catch (error) {
    console.error('Error in chat-with-ai:', error);
    return createErrorResponse(
      'AI chat service temporarily unavailable',
      HTTP_STATUS.INTERNAL_ERROR,
      ERROR_CODES.INTERNAL_ERROR,
    );
  }
});

// NOTE: keep the export shape stable to avoid Vite Fast Refresh warnings.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/components/ui/sidebar';
import { useChatSecurity } from '@/hooks/useChatSecurity';
import { useRealTimeChat } from '@/hooks/useRealTimeChat';
import { bindComposerHeight } from '@/lib/composer-sizing';
import {
  detectPolicyIntent,
  loadPolicyTemplate,
  getPolicyTypeFromInput,
  POLICY_TEMPLATES,
  type PolicyType,
} from '@/lib/policyGenerator';
import { getPolicyFormSchema } from '@/lib/policySchema';
import { callFn, callFnStream } from '@/lib/call-fn';
import type { Message, Conversation, CurrentConversation, PolicyGenerationState } from '../types';

export default function useAiChatController(isDemo: boolean) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ conversationId?: string }>();

  const { state: sidebarState } = useSidebar();
  const sidebarCollapsed = sidebarState === 'collapsed';

  const { toast } = useToast();
  const { user } = useAuth();
  const { validateMessage, checkAuthentication, validateSession } = useChatSecurity();
  const { messages: _rt } = useRealTimeChat();

  const [searchParams, setSearchParams] = useSearchParams();

  // ------- Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  const suppressNextRouteLoadRef = useRef(false);
  const lastLoadedConvRef = useRef<string | null>(null);
  const lastCreatedConvRef = useRef<string | null>(null);
  const hasAnchoredBottomRef = useRef(false);
  const reachedTopRef = useRef(false);
  const mutationKindRef = useRef<'prepend' | 'append' | null>(null);
  const triggeredIndexDocsRef = useRef(new Set<string>());

  // ------- State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [messageToSend, setMessageToSend] = useState('');
  const [loading, setLoading] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [firstChunkTimeout, setFirstChunkTimeout] = useState<NodeJS.Timeout | null>(null);

  const [initialLoading, setInitialLoading] = useState(false);
  const [olderLoading, setOlderLoading] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [beforeCursor, setBeforeCursor] = useState<string | null>(null);
  const [paginationArmed, setPaginationArmed] = useState(false);

  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);
  const [activeDocuments, setActiveDocuments] = useState<string[]>([]);
  const [indexingBlocked, setIndexingBlocked] = useState(false);
  const [indexingHint, setIndexingHint] = useState<string | undefined>(undefined);

  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [currentConversation, setCurrentConversation] = useState<CurrentConversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showChatHistory, setShowChatHistory] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');

  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showNewMessageIndicator, setShowNewMessageIndicator] = useState(false);

  const [isEscalated, setIsEscalated] = useState(false);
  const [showContextualEscalation, setShowContextualEscalation] = useState(false);
  const [escalationRationale, setEscalationRationale] = useState<string | null>(null);
  const [lastAssistantReplyCount, setLastAssistantReplyCount] = useState(0);

  const [sessionStart] = useState(new Date());
  const [conversationContext, setConversationContext] = useState({
    documentCount: 0,
    messageCount: 0,
  });

  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState('');

  const [policyGenerationState, setPolicyGenerationState] = useState<PolicyGenerationState>({
    isActive: false,
    policyType: null,
    template: null,
    missingFields: [],
    currentFieldGroup: 0,
    userAnswers: {},
    generatedPolicy: null,
    isGenerating: false,
    formSchema: undefined,
    lastPdfUrl: null,
  });

  // ----- layout bindings -----
  useEffect(() => {
    if (composerRef.current) {
      const cleanup = bindComposerHeight(composerRef.current);
      return cleanup;
    }
  }, []);

  // ?new=true compatibility (start fresh)
  useEffect(() => {
    const newParam = searchParams.get('new');
    if (newParam === 'true') {
      startNewConversation();
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // track new assistant replies
  useEffect(() => {
    const assistantCount = messages.filter((m) => m.role === 'assistant').length;
    if (assistantCount > lastAssistantReplyCount) {
      setLastAssistantReplyCount(assistantCount);
    }
  }, [messages, lastAssistantReplyCount]);

  // Auto scroll when near bottom; only show pill for appends
  useEffect(() => {
    if (loading) return;
    if (isNearBottom) {
      scrollToBottom();
      setShowNewMessageIndicator(false);
    } else if (messages.length > 0) {
      if (mutationKindRef.current === 'append') {
        setShowNewMessageIndicator(true);
      }
    }
    mutationKindRef.current = null;
  }, [messages, isNearBottom, loading]);

  // When returning from history list, snap to bottom and then arm pagination
  const prevShowHistoryRef = useRef(false);
  useEffect(() => {
    triggeredIndexDocsRef.current.clear();
  }, [currentConversationId]);
  useEffect(() => {
    if (prevShowHistoryRef.current && !showChatHistory) {
      scrollToBottomAfterRender(false);
      setTimeout(armAfterBottom, 50);
    }
    prevShowHistoryRef.current = showChatHistory;
  }, [showChatHistory]);

  // Initial boot + route-based load
  useEffect(() => {
    if (!user || isDemo) return;

    loadUserDocuments();
    loadConversations();

    const pathname = location.pathname;
    const routeId = params.conversationId;

    if (pathname.endsWith('/chat/new')) {
      startNewConversation();
      return;
    }

    if (routeId) {
      if (routeId === currentConversationId && messages.length > 0) return;

      if (suppressNextRouteLoadRef.current) {
        suppressNextRouteLoadRef.current = false;
        setCurrentConversationId(routeId);
        lastLoadedConvRef.current = routeId;
        setTimeout(() => {
          scrollToBottom({ smooth: false });
          setTimeout(armAfterBottom, 30);
        }, 0);
        return;
      }

      if (lastLoadedConvRef.current === routeId && messages.length > 0) return;

      openConversationByRoute(routeId);
    } else if (pathname.endsWith('/chat')) {
      setCurrentConversationId(null);
      setMessages([]);
      setInitialLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isDemo, location.pathname, params.conversationId]);

  // Derive indexing gate from activeDocuments + uploadedDocuments
  useEffect(() => {
    if (!activeDocuments || activeDocuments.length === 0) {
      setIndexingBlocked(false);
      setIndexingHint(undefined);
      return;
    }
    // Map by id for quick lookups
    const byId = new Map(uploadedDocuments.map((d: any) => [d.id, d]));
    let minProgress = 100;
    let anyQueuedOrProcessing = false;
    let anyFailed = false;
    for (const id of activeDocuments) {
      const d: any = byId.get(id);
      if (!d) continue;
      const status = (d.processing_status as string) || 'pending';
      const progress = Number(d.index_progress ?? 0);
      minProgress = Math.min(minProgress, progress);
      if (status === 'failed') anyFailed = true;
      if (status !== 'completed') anyQueuedOrProcessing = true;
    }
    if (anyFailed) {
      setIndexingBlocked(true);
      setIndexingHint('Document indexing failed. Please re-upload.');
      return;
    }
    // Gate sending until first chunks are indexed for attached docs
    // Allow send once progress >= 10 (first batch ready) or marked completed
    if (anyQueuedOrProcessing && minProgress < 10) {
      setIndexingBlocked(true);
      setIndexingHint(`Preparing document… ${minProgress}%`);
    } else {
      setIndexingBlocked(false);
      setIndexingHint(undefined);
    }
  }, [activeDocuments, uploadedDocuments]);

  // Realtime document updates for progress/status
  useEffect(() => {
    if (!user || !user.id) return;

    const channel = supabase
      .channel('realtime:documents')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'documents', filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          setUploadedDocuments((prev) => {
            const next = [...prev];
            const idx = next.findIndex((d: any) => d.id === payload.new?.id);
            if (payload.eventType === 'INSERT') {
              if (idx === -1) return [payload.new, ...next];
              next[idx] = { ...next[idx], ...payload.new };
              return next;
            }
            if (payload.eventType === 'UPDATE') {
              if (idx !== -1) {
                next[idx] = { ...next[idx], ...payload.new };
                return next;
              }
              return [payload.new, ...next];
            }
            if (payload.eventType === 'DELETE') {
              return next.filter((d: any) => d.id !== payload.old?.id);
            }
            return next;
          });
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to documents realtime');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Auto-resize input
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  // ----- data loaders -----
  async function loadUserDocuments() {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('uploaded_at', { ascending: false });
      if (!error) setUploadedDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  }

  async function loadConversations() {
    try {
      const { data } = await callFn<{ conversations: Conversation[]; pagination: any }>(
        'chat-api/conversations?limit=200&offset=0',
        { method: 'GET' },
      );
      setConversations(data?.conversations || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  }

  // --- Scroll helpers & pagination arming ---
  const scrollToBottom = (opts?: { smooth?: boolean }) =>
    messagesEndRef.current?.scrollIntoView({
      behavior: opts?.smooth === false ? 'auto' : 'smooth',
    });

  const scrollToBottomAfterRender = (smooth = true) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollToBottom({ smooth }));
    });
  };

  // Helper to send a specific message with a specific set of documents
  const sendMessageWithDocuments = async (
    content: string,
    docIds: string[],
    docNames?: string[],
    docMeta?: Array<{ id: string; name: string; type?: string; size?: number }>,
    preferInlineDocs: boolean = true,
  ) => {
    const picked = Array.from(new Set(docIds)).slice(0, 3);
    // Focus ONLY provided docs for this turn
    setActiveDocuments(picked);
    setInput(content);
    setMessageToSend(content);
    await handleSendMessage({
      contentOverride: content,
      activeDocumentsOverride: picked,
      documentNamesOverride: (docNames || []).slice(0, 3),
      docMetaOverride: docMeta,
      preferInlineDocsFlag: preferInlineDocs,
    });
    // Clear selection after sending to avoid carry-over
    setActiveDocuments([]);
  };

  const sendImagesMessage = async (
    content: string,
    images: Array<{ id?: string; name: string; previewUrl: string }>,
  ) => {
    const previews = images.map((i) => i.previewUrl).slice(0, 3);
    const ids = images.map((i) => i.id).filter(Boolean) as string[];
    setInput(content);
    setMessageToSend(content);
    await handleSendMessage({
      contentOverride: content,
      imagePreviewsOverride: previews,
      imageAssetIdsOverride: ids.slice(0, 3),
    });
  };

  const armAfterBottom = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 4;
    if (atBottom) {
      hasAnchoredBottomRef.current = true;
      setPaginationArmed(true);
    } else {
      requestAnimationFrame(() => {
        const el2 = messagesContainerRef.current;
        if (!el2) return;
        const atBottom2 = el2.scrollHeight - el2.scrollTop - el2.clientHeight < 4;
        if (atBottom2) {
          hasAnchoredBottomRef.current = true;
          setPaginationArmed(true);
        }
      });
    }
  };

  // ----- Open conversation by route -----
  async function openConversationByRoute(conversationId: string) {
    setInitialLoading(true);
    setMessages([]);
    setCurrentConversationId(conversationId);
    setBeforeCursor(null);
    setHasMoreOlder(false);
    setPaginationArmed(false);
    hasAnchoredBottomRef.current = false;
    reachedTopRef.current = false;
    mutationKindRef.current = null;
    // Reset active docs on navigation to prevent cross-chat carryover
    setActiveDocuments([]);

    try {
      const { data } = await callFn<{
        messages: any[];
        page?: { next_before: string | null; has_more: boolean };
      }>(`chat-api/conversations/${conversationId}/messages?limit=20`, { method: 'GET' });

      const rawMessages = data?.messages || [];
      const loaded = rawMessages.map((m: any) => ({
        role: (m.role === 'consultant' ? 'assistant' : m.role) as 'user' | 'assistant',
        content: m.content,
        timestamp: new Date(m.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        id: m.id,
        suggestions: Array.isArray(m.metadata?.suggestions) ? m.metadata.suggestions : undefined,
        metadata: m.metadata || undefined,
      })) as Message[];

      // Do not hydrate a global draft UI; drafts will be embedded in their own messages.

      // Hydrate policy schema UI from persisted schema message
      // Find the latest policy_schema message from the end to start
      let schemaRow: any | null = null;
      let isLastMessage = false;
      for (let i = rawMessages.length - 1; i >= 0; i--) {
        const m = rawMessages[i];
        if (m.role === 'assistant' && m.metadata?.type === 'policy_schema') {
          schemaRow = m;
          isLastMessage = i === rawMessages.length - 1;
          break;
        }
      }
      if (schemaRow) {
        const rawType = (schemaRow.metadata?.policy_type as string) || '';
        const isKnownType =
          rawType && Object.prototype.hasOwnProperty.call(POLICY_TEMPLATES, rawType);
        const effectiveType = (isKnownType ? (rawType as PolicyType) : prev.policyType) || null;
        const metaTitle = (schemaRow.metadata?.title as string) || '';
        const fallbackTitle = effectiveType
          ? POLICY_TEMPLATES[effectiveType].title
          : prev.schemaTitle || '';
        setPolicyGenerationState((prev) => ({
          ...prev,
          isActive: true,
          generatedPolicy: prev.generatedPolicy || null, // don't override existing draft hydration
          isGenerating: false,
          policyType: effectiveType || null,
          formSchema: (schemaRow.metadata?.schema as any) || prev.formSchema,
          schemaTitle: metaTitle || fallbackTitle,
          schemaGuidance:
            (schemaRow.metadata?.guidance_text as string) ||
            schemaRow.content ||
            prev.schemaGuidance,
          schemaCanContinue: isLastMessage,
        }));
      }

      // Keep all messages including policy_draft so we can embed UI under that bubble
      setMessages(loaded);
      setBeforeCursor(data?.page?.next_before ?? null);
      setHasMoreOlder(!!data?.page?.has_more);
      reachedTopRef.current = !(data?.page?.has_more && data?.page?.next_before);

      const conv = conversations.find((c) => c.id === conversationId) || null;
      if (conv) setCurrentConversation({ id: conv.id, title: conv.title, tags: conv.tags || [] });

      lastLoadedConvRef.current = conversationId;

      setInitialLoading(false);
      scrollToBottomAfterRender(false);
      setTimeout(armAfterBottom, 50);
      setShowChatHistory(false);
    } catch (error) {
      console.error('Error loading conversation (route):', error);
      setInitialLoading(false);
      toast({
        title: 'Error',
        description: 'Failed to load conversation.',
        variant: 'destructive',
      });
    }
  }

  // ----- Load older messages (pagination) -----
  async function loadOlderMessages() {
    if (!currentConversationId || !beforeCursor || olderLoading || reachedTopRef.current) return;
    setOlderLoading(true);

    const container = messagesContainerRef.current;
    const prevScrollHeight = container?.scrollHeight ?? 0;
    const prevScrollTop = container?.scrollTop ?? 0;

    const disableSmooth = () => {
      if (!container) return () => {};
      const prev = container.style.scrollBehavior;
      container.style.scrollBehavior = 'auto';
      return () => {
        container.style.scrollBehavior = prev || '';
      };
    };

    try {
      const { data } = await callFn<{
        messages: any[];
        page?: { next_before: string | null; has_more: boolean };
      }>(
        `chat-api/conversations/${currentConversationId}/messages?limit=20&before=${encodeURIComponent(
          beforeCursor,
        )}`,
        { method: 'GET' },
      );

      const rows = data?.messages || [];
      const nextBefore = data?.page?.next_before ?? null;
      const hasMore = !!data?.page?.has_more;

      if (rows.length > 0) {
        const older = rows.map((m: any) => ({
          role: (m.role === 'consultant' ? 'assistant' : m.role) as 'user' | 'assistant',
          content: m.content,
          timestamp: new Date(m.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          id: m.id,
          suggestions: Array.isArray(m.metadata?.suggestions) ? m.metadata.suggestions : undefined,
          metadata: m.metadata || undefined,
        })) as Message[];

        mutationKindRef.current = 'prepend';
        setMessages((prev) => [...older, ...prev]);

        const restore = disableSmooth();
        requestAnimationFrame(() => {
          const newScrollHeight = container?.scrollHeight ?? 0;
          if (container) {
            container.scrollTop = newScrollHeight - prevScrollHeight + prevScrollTop - 10;
          }
          restore();
        });
      }

      setBeforeCursor(nextBefore);
      setHasMoreOlder(hasMore);
      if (!hasMore || !nextBefore) {
        reachedTopRef.current = true;
      }

      setShowNewMessageIndicator(false);
    } catch (e) {
      console.error('Failed to load older messages', e);
    } finally {
      setOlderLoading(false);
    }
  }

  // ----- IntersectionObserver for top sentinel -----
  useEffect(() => {
    const root = messagesContainerRef.current;
    const target = topSentinelRef.current;
    if (!root || !target) return;

    if (
      !paginationArmed ||
      initialLoading ||
      olderLoading ||
      !hasMoreOlder ||
      reachedTopRef.current
    )
      return;

    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (!e?.isIntersecting) return;
        const el = messagesContainerRef.current;
        if (!el) return;
        if (el.scrollTop <= 30 && !olderLoading && hasMoreOlder && !reachedTopRef.current) {
          loadOlderMessages();
        }
      },
      {
        root,
        rootMargin: '150px 0px 0px 0px',
        threshold: 0,
      },
    );

    io.observe(target);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    paginationArmed,
    hasMoreOlder,
    olderLoading,
    initialLoading,
    beforeCursor,
    currentConversationId,
  ]);

  // ----- Scroll handler -----
  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;

    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setIsNearBottom(atBottom);
    if (atBottom) {
      setShowNewMessageIndicator(false);
      if (!hasAnchoredBottomRef.current) {
        hasAnchoredBottomRef.current = true;
        setPaginationArmed(true);
      }
    }

    // near-top fallback trigger
    if (
      paginationArmed &&
      hasAnchoredBottomRef.current &&
      el.scrollTop < 60 &&
      hasMoreOlder &&
      !olderLoading &&
      !initialLoading &&
      !reachedTopRef.current
    ) {
      loadOlderMessages();
    }
  };

  const scrollToBottomAndMarkRead = () => {
    scrollToBottom();
    setShowNewMessageIndicator(false);
    setIsNearBottom(true);
  };

  // ----- Conversation management -----
  const startNewConversation = () => {
    setMessages([]);
    setCurrentConversationId(null);
    setCurrentConversation(null);
    setShowChatHistory(false);
    setEditingTitle(false);
    setEditTitleValue('');
    setBeforeCursor(null);
    setHasMoreOlder(false);
    setPaginationArmed(false);
    hasAnchoredBottomRef.current = false;
    reachedTopRef.current = false;
    mutationKindRef.current = null;

    if (location.pathname !== '/dashboard/chat/new') {
      navigate('/dashboard/chat/new', { replace: true });
    }
  };

  async function deleteConversation(conversationId: string) {
    try {
      const { error } = await supabase.from('chat_conversations').delete().eq('id', conversationId);
      if (error) throw error;

      if (conversationId === currentConversationId) startNewConversation();
      loadConversations();
      toast({ title: 'Conversation deleted', description: 'The conversation has been removed.' });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete conversation.',
        variant: 'destructive',
      });
    }
  }

  const handleDocumentUploaded = (document: any) => {
    // Optimistically mark as processing for UI until Realtime updates arrive
    const optimistic = {
      ...document,
      processing_status: document.processing_status || 'processing',
      index_step: document.index_step || 'queued',
      index_progress: typeof document.index_progress === 'number' ? document.index_progress : 0,
    };
    setUploadedDocuments((prev) => [optimistic, ...prev]);
    setActiveDocuments((prev) => [...prev, document.id]);
    setConversationContext((prev) => ({ ...prev, documentCount: prev.documentCount + 1 }));

    // If this upload created a conversation, navigate to it
    if (document.conversation_id && !currentConversationId) {
      navigate(`/dashboard/chat/${document.conversation_id}`);
      toast({
        title: 'Document uploaded & conversation created',
        description: 'Your document is ready for AI analysis. Start chatting!',
      });
    } else {
      toast({
        title: 'Document uploaded',
        description: 'Your document is now available for AI analysis in future conversations.',
      });
    }
  };

  // ----- Consultant message -----
  async function handleMessageToConsultant(messageContent: string) {
    const userMessage: Message = {
      role: 'user',
      content: messageContent,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    mutationKindRef.current = 'append';
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setMessageToSend('');
    setLoading(true);

    try {
      if (!currentConversationId) throw new Error('No conversation available');
      const { error } = await callFn(`chat-api/conversations/${currentConversationId}/messages`, {
        method: 'POST',
        body: { content: messageContent },
      });
      if (error) throw error;

      toast({
        title: 'Message sent',
        description: 'Your message has been sent to the expert. They will respond shortly.',
      });
    } catch (error: any) {
      console.error('Error sending message to consultant:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  // ----- Retry/stop -----
  const handleRetry = async (originalMessage: string) => {
    if (retryCount >= 3) {
      toast({
        title: 'Max retries reached',
        description: 'Please try again later.',
        variant: 'destructive',
      });
      return;
    }
    setRetryCount((prev) => prev + 1);
    setInput(originalMessage);
    setMessageToSend('');
    await new Promise((r) => setTimeout(r, Math.pow(2, retryCount) * 1000));
    handleSendMessage();
  };

  const handleStopGeneration = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
  };

  // ----- Clipboard / reactions / suggestions -----
  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({ title: 'Copied', description: 'Message copied to clipboard' });
  };

  const handleMessageReaction = (_messageId: string, reaction: 'up' | 'down') => {
    toast({
      title: reaction === 'up' ? 'Feedback sent' : 'Feedback noted',
      description: `Thank you for your ${reaction === 'up' ? 'positive' : ''} feedback!`,
    });
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    setMessageToSend('');
    inputRef.current?.focus();
  };

  // ----- Title editing -----
  async function updateConversationTitle(newTitle: string, newTags: string[]) {
    if (!currentConversationId || !newTitle.trim()) return;
    try {
      const { error } = await callFn('update-chat-title', {
        body: { conversationId: currentConversationId, title: newTitle, tags: newTags },
      });
      if (error) throw error;

      setCurrentConversation((prev) => (prev ? { ...prev, title: newTitle, tags: newTags } : null));
      loadConversations();
      toast({
        title: 'Title updated',
        description: 'Conversation title has been updated successfully.',
      });
      setEditingTitle(false);
    } catch (error) {
      console.error('Error updating title:', error);
      toast({
        title: 'Error',
        description: 'Failed to update conversation title.',
        variant: 'destructive',
      });
    }
  }

  const startEditingTitle = () => {
    if (currentConversation) {
      setEditTitleValue(currentConversation.title);
      setEditingTitle(true);
    }
  };

  const cancelEditingTitle = () => {
    setEditingTitle(false);
    setEditTitleValue('');
  };

  const saveTitle = () => {
    if (!editTitleValue.trim()) return;
    const tags = currentConversation?.tags || [];
    updateConversationTitle(editTitleValue.trim(), tags);
  };

  // ---------- Policy helpers ----------
  const handlePolicyGenerationFlow = async (
    intent: 'unspecified' | 'specified',
    userMessage: string,
  ) => {
    // Ensure a conversation exists and route is set for policy flows
    if (!currentConversationId && user && !isDemo) {
      try {
        const title =
          userMessage && userMessage.length > 0 ? userMessage.slice(0, 60) : 'New Conversation';
        const { data: newConv, error: convErr } = await supabase
          .from('chat_conversations')
          .insert({ user_id: user.id, title, tags: [] })
          .select()
          .single();
        if (!convErr && newConv) {
          // Prevent route-load effect from reloading while mid-flow
          suppressNextRouteLoadRef.current = true;
          lastCreatedConvRef.current = newConv.id;
          setCurrentConversationId(newConv.id);
          setCurrentConversation({
            id: newConv.id,
            title: newConv.title,
            tags: newConv.tags || [],
          });
          navigate(`/dashboard/chat/c/${newConv.id}`, { replace: true });
        }
      } catch (e) {
        console.warn('Failed to create conversation for policy flow:', e);
      }
    }
    const userChatMessage: Message = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    mutationKindRef.current = 'append';
    setMessages((prev) => [...prev, userChatMessage]);
    setInput('');
    setMessageToSend('');

    // Persist user message to this conversation
    try {
      const convId = currentConversationId || lastCreatedConvRef.current;
      if (convId) {
        const { data: inserted, error: insErr } = await supabase
          .from('chat_messages')
          .insert({ conversation_id: convId, role: 'user', content: userMessage })
          .select('id')
          .single();
        if (!insErr && inserted?.id) {
          setMessages((prev) => {
            const next = [...prev];
            // attach id to the last appended user message
            for (let i = next.length - 1; i >= 0; i--) {
              if (next[i].role === 'user' && !next[i].id) {
                next[i] = { ...next[i], id: inserted.id };
                break;
              }
            }
            return next;
          });
        }
      }
    } catch (e) {
      console.warn('Failed to persist user policy message:', e);
    }

    if (intent === 'unspecified') {
      const policySelectionMessage: Message = {
        role: 'assistant',
        content: 'Sure — which policy do you need? Quick options:',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: [
          'Password Management Policy',
          'Acceptable Use Policy',
          'Incident Response Policy',
          'Mobile Device Policy',
          'Other (specify type)',
        ],
      };
      mutationKindRef.current = 'append';
      setMessages((prev) => [...prev, policySelectionMessage]);
    } else {
      const policyInfo = getPolicyTypeFromInput(userMessage);
      if (policyInfo) {
        await initiatePolicyGeneration(policyInfo.type, userMessage, policyInfo.title);
      } else {
        const fallbackMessage: Message = {
          role: 'assistant',
          content: 'I can help you create a policy! Which type would you like?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestions: [
            'Password Management Policy',
            'Acceptable Use Policy',
            'Incident Response Policy',
            'Mobile Device Policy',
          ],
        };
        mutationKindRef.current = 'append';
        setMessages((prev) => [...prev, fallbackMessage]);
      }
    }
  };

  const initiatePolicyGeneration = async (
    policyType: PolicyType,
    _userMessage: string,
    customTitle?: string,
  ) => {
    try {
      // Show a thinking placeholder until schema arrives
      const thinkingId = `streaming_schema_${Date.now()}`;
      const thinkingMsg: Message = {
        id: thinkingId,
        role: 'assistant',
        content: '',
        isStreaming: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      mutationKindRef.current = 'append';
      setMessages((prev) => [...prev, thinkingMsg]);

      // 1) Ask backend AI for a schema + guidance
      const { data: schemaResp, error: schemaErr } = await supabase.functions.invoke(
        'policy-schema',
        {
          body: {
            message: _userMessage,
          },
        },
      );
      if (schemaErr) throw schemaErr;

      const aiPolicyType: any = schemaResp?.policy_type || policyType;
      const effectiveType =
        aiPolicyType && POLICY_TEMPLATES[aiPolicyType as PolicyType]
          ? (aiPolicyType as PolicyType)
          : policyType;

      const template = await loadPolicyTemplate(effectiveType);
      const formSchema =
        Array.isArray(schemaResp?.schema) && schemaResp.schema.length
          ? schemaResp.schema
          : getPolicyFormSchema(effectiveType);

      // 2) Replace thinking with AI guidance once available; attach metadata so UI can embed the form immediately
      if (schemaResp?.guidance_text) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === thinkingId
              ? {
                  ...m,
                  isStreaming: false,
                  content: String(schemaResp.guidance_text),
                  metadata: {
                    ...(m.metadata || {}),
                    type: 'policy_schema',
                    policy_type: effectiveType,
                    title: String(schemaResp?.title || ''),
                    schema: formSchema,
                    guidance_text: String(schemaResp.guidance_text || ''),
                  },
                }
              : m,
          ),
        );
        // Persist schema+guidance as assistant message with schema metadata
        try {
          const convId = currentConversationId || lastCreatedConvRef.current;
          if (convId) {
            const { data: ins2 } = await supabase
              .from('chat_messages')
              .insert({
                conversation_id: convId,
                role: 'assistant',
                content: String(schemaResp.guidance_text),
                metadata: {
                  type: 'policy_schema',
                  policy_type: effectiveType,
                  title: String(schemaResp?.title || ''),
                  schema: formSchema,
                  guidance_text: String(schemaResp.guidance_text || ''),
                },
              })
              .select('id')
              .single();
            if (ins2?.id) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === thinkingId
                    ? {
                        ...m,
                        id: ins2.id,
                        metadata: {
                          ...(m.metadata || {}),
                          type: 'policy_schema',
                          policy_type: effectiveType,
                          title: String(schemaResp?.title || ''),
                          schema: formSchema,
                          guidance_text: String(schemaResp.guidance_text || ''),
                        },
                      }
                    : m,
                ),
              );
            }
          }
        } catch (e) {
          console.warn('Failed to persist guidance message:', e);
        }
      } else {
        // No guidance returned; remove the thinking message
        setMessages((prev) => prev.filter((m) => m.id !== thinkingId));
      }

      setPolicyGenerationState({
        isActive: true,
        policyType: effectiveType,
        template,
        missingFields: [],
        currentFieldGroup: 0,
        userAnswers: {},
        generatedPolicy: null,
        isGenerating: false,
        formSchema,
        lastPdfUrl: null,
        schemaTitle: String(schemaResp?.title || ''),
        schemaGuidance: String(schemaResp?.guidance_text || ''),
        schemaCanContinue: true,
      });
    } catch (error) {
      console.error('Error initiating policy generation:', error);
      toast({
        title: 'Error',
        description: 'Failed to load policy template. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handlePolicyFieldsSubmit = async (answers: Record<string, string>) => {
    const updatedAnswers = { ...policyGenerationState.userAnswers, ...answers };
    setPolicyGenerationState((prev) => ({
      ...prev,
      userAnswers: updatedAnswers,
      isGenerating: true,
    }));

    try {
      // 3) Generate the policy via backend AI using answers and type
      const { data: genResp, error: genErr } = await supabase.functions.invoke('policy-generate', {
        body: {
          message: messages[messages.length - 1]?.content || '',
          policy_type: policyGenerationState.policyType || 'generic_template',
          title:
            policyGenerationState.schemaTitle && policyGenerationState.schemaTitle.trim()
              ? policyGenerationState.schemaTitle.trim()
              : policyGenerationState.policyType
                ? POLICY_TEMPLATES[policyGenerationState.policyType].title
                : 'Policy',
          frameworks: [],
          answers: updatedAnswers,
        },
      });
      if (genErr) throw genErr;
      const md = String(genResp?.policy_markdown || '').trim();
      if (!md) throw new Error('Empty draft');

      await generatePolicyDocument(policyGenerationState.template || '', {}, updatedAnswers, md);
    } catch (err) {
      console.error('Error generating policy draft:', err);
      toast({
        title: 'Error',
        description: 'Failed to generate policy draft.',
        variant: 'destructive',
      });
      setPolicyGenerationState((prev) => ({ ...prev, isGenerating: false }));
    }
  };

  const handlePolicyUseDefaults = async () => {
    await handlePolicyFieldsSubmit({});
  };

  const generatePolicyDocument = async (
    _template: string,
    _userProfile: Record<string, any>,
    _answers: Record<string, string>,
    policyMarkdown?: string,
  ) => {
    setPolicyGenerationState((prev) => ({ ...prev, isGenerating: true }));
    try {
      const resultPolicy = (policyMarkdown && policyMarkdown.trim()) || undefined;
      const policyText = resultPolicy ?? 'Policy draft is unavailable.';
      // Persist assistant draft to conversation and append a corresponding chat bubble
      try {
        const convId = currentConversationId || lastCreatedConvRef.current;
        if (convId) {
          const { data: ins3 } = await supabase
            .from('chat_messages')
            .insert({
              conversation_id: convId,
              role: 'assistant',
              content: policyText,
              metadata: { type: 'policy_draft' },
            })
            .select('id, metadata, content, created_at')
            .single();
          const newMsg: Message = {
            id: ins3?.id || `draft_${Date.now()}`,
            role: 'assistant',
            content: policyText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            metadata: { ...(ins3?.metadata || {}), type: 'policy_draft' },
          };
          mutationKindRef.current = 'append';
          setMessages((prev) => [...prev, newMsg]);
        }
      } catch (e) {
        console.warn('Failed to persist policy draft:', e);
        // Still show locally
        const newMsg: Message = {
          id: `draft_${Date.now()}`,
          role: 'assistant',
          content: policyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          metadata: { type: 'policy_draft' },
        };
        mutationKindRef.current = 'append';
        setMessages((prev) => [...prev, newMsg]);
      }
      setPolicyGenerationState((prev) => ({
        ...prev,
        generatedPolicy: null,
        isGenerating: false,
        isActive: false,
      }));
      toast({
        title: 'Policy Generated',
        description: 'Your custom policy has been created successfully.',
      });
    } catch (error) {
      console.error('Error generating policy:', error);
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate policy. Please try again.',
        variant: 'destructive',
      });
      setPolicyGenerationState((prev) => ({ ...prev, isGenerating: false }));
    }
  };

  // hydrate assistant id
  const hydrateAssistantId = async (convId: string): Promise<string | undefined> => {
    try {
      const { data } = await callFn<{ messages: any[] }>(
        `chat-api/conversations/${convId}/messages?limit=3`,
        { method: 'GET' },
      );
      const list = data?.messages || [];
      for (let i = list.length - 1; i >= 0; i--) {
        const m = list[i];
        if (m.role === 'assistant') return m.id as string;
      }
    } catch {}
    return undefined;
  };

  // ----- Send message (streaming) -----
  const handleSendMessage = async (opts?: {
    contentOverride?: string;
    activeDocumentsOverride?: string[];
    documentNamesOverride?: string[];
    preferInlineDocsFlag?: boolean;
    imagePreviewsOverride?: string[];
    imageAssetIdsOverride?: string[];
  }) => {
    if (loading) return;

    // Block sending if attached docs haven't produced initial chunks yet
    const idsToCheck =
      opts?.activeDocumentsOverride && opts.activeDocumentsOverride.length
        ? opts.activeDocumentsOverride
        : activeDocuments;
    if (idsToCheck && idsToCheck.length > 0) {
      const byId = new Map(uploadedDocuments.map((d: any) => [d.id, d]));
      let anyFailed = false;
      for (const id of idsToCheck) {
        const d: any = byId.get(id);
        if (!d) continue;
        const status = (d.processing_status as string) || 'pending';
        if (status === 'failed') anyFailed = true;
      }
      if (anyFailed) {
        toast({
          title: 'Document indexing failed',
          description: 'Please re-upload and try again.',
          variant: 'destructive',
        });
        return;
      }
    }

    const rawFromState = input.trim().length ? input : messageToSend.trim();
    const raw = (opts?.contentOverride ?? '').trim().length
      ? (opts?.contentOverride as string)
      : rawFromState;
    if (!raw) return;

    if (!checkAuthentication()) {
      window.location.href = '/auth';
      return;
    }
    if (!(await validateSession())) return;

    if (raw.length < 2) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter at least 2 characters.',
        variant: 'destructive',
      });
      return;
    }

    const validation = validateMessage(raw);
    if (!validation.isValid) {
      toast({
        title: 'Invalid Message',
        description: validation.threats.join(', '),
        variant: 'destructive',
      });
      return;
    }
    const sanitizedMessage = (validation.sanitizedContent || raw).trim();
    if (sanitizedMessage.length < 3) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter a meaningful request.',
        variant: 'destructive',
      });
      return;
    }

    // ---------- Hybrid policy router (Phase 1: heuristic, Phase 2: AI classifier) ----------
    // Expanded verbs/nouns to catch more natural phrasing
    const isLikelyPolicyRequestHeuristic = (text: string) => {
      const t = text.toLowerCase();
      const verbs = [
        'create',
        'draft',
        'generate',
        'write',
        'produce',
        'develop',
        'compose',
        'prepare',
        'formulate',
        'build',
        'make',
        'make me',
        'make a',
        'need',
        'need a',
        'want',
        'want a',
        'help',
        'help me',
        'spin up',
        'come up with',
      ];
      const nouns = [
        'policy',
        'policy template',
        'template',
        'standard',
        'guideline',
        'procedure',
        'plan',
        'information security policy',
        'infosec policy',
        'security policy',
        'iam policy',
        'access control policy',
      ];
      const hasVerb = verbs.some((v) => t.includes(v));
      const hasNoun = nouns.some((n) => t.includes(n));
      // Also catch patterns like "<X> policy using <framework>"
      const pattern =
        /(policy|template)\s+(using|for|aligned to|aligned with)\s+(soc\s*2|iso\s*27001|nist|hipaa|gdpr|pci\s*dss|fedramp|cmmc)/i;
      const matchesPattern = pattern.test(text);
      const containsPolicyWord = /\bpolicy\b|\bpolicy template\b/i.test(text);
      return (hasVerb && hasNoun) || matchesPattern || containsPolicyWord;
    };

    const extractFrameworks = (text: string): string[] => {
      const t = text.toLowerCase();
      const fws: string[] = [];
      const add = (x: string) => {
        if (!fws.includes(x)) fws.push(x);
      };
      if (/soc\s*-?\s*2|soc2/.test(t)) add('SOC 2');
      if (/iso\s*-?\s*27001/.test(t)) add('ISO 27001');
      if (/nist\s*csf/.test(t)) add('NIST CSF');
      if (/nist\s*800-?171/.test(t)) add('NIST 800-171');
      if (/hipaa/.test(t)) add('HIPAA');
      if (/gdpr/.test(t)) add('GDPR');
      if (/pci\s*dss/.test(t)) add('PCI DSS');
      if (/fedramp/.test(t)) add('FedRAMP');
      if (/cmmc/.test(t)) add('CMMC');
      return fws;
    };

    const extractRoughTitle = (text: string): string | null => {
      const t = text.trim();
      // Simple grab: anything before "policy" becomes the stem
      const m = t.match(/(.+?)\s*(policy|policy template)/i);
      if (m && m[1]) {
        const words = m[1]
          .replace(/using .+$/i, '')
          .replace(/aligned.*$/i, '')
          .trim();
        if (words)
          return (
            words
              .replace(/\s+/g, ' ')
              .split(' ')
              .map((w) => w[0]?.toUpperCase() + w.slice(1))
              .join(' ') + ' Policy'
          );
      }
      return null;
    };

    // Phase 1: heuristic route to policy flow
    if (isLikelyPolicyRequestHeuristic(sanitizedMessage)) {
      const frameworks = extractFrameworks(sanitizedMessage);
      const roughTitle = extractRoughTitle(sanitizedMessage);
      const guess = getPolicyTypeFromInput(sanitizedMessage);
      // If we have any signal, go straight to policy flow
      await handlePolicyGenerationFlow(guess?.type ? 'specified' : 'unspecified', sanitizedMessage);
      return;
    }

    // Phase 2: fast AI classifier only if it contains "policy" and the heuristic wasn't decisive
    if (/\bpolicy\b|\btemplate\b/i.test(sanitizedMessage)) {
      try {
        const { data: intentResp } = await supabase.functions.invoke('policy-intent', {
          body: { message: sanitizedMessage },
        });
        if (intentResp && intentResp.is_policy && (Number(intentResp.confidence) || 0) >= 0.6) {
          const clsType: any = intentResp.policy_type || null;
          const titleStr: string | undefined = intentResp.title || undefined;
          const derived =
            clsType && POLICY_TEMPLATES[clsType as PolicyType]
              ? (clsType as PolicyType)
              : getPolicyTypeFromInput(sanitizedMessage).type;
          await initiatePolicyGeneration(derived, sanitizedMessage, titleStr);
          return;
        }
      } catch (e) {
        // Swallow classification failures; fall through to normal chat
      }
    }

    // Intercept policy confirmation / changes intents before AI send
    if (
      policyGenerationState.isActive &&
      policyGenerationState.generatedPolicy &&
      /^\s*(proceed|proceed with this draft|looks good|save policy)\b/i.test(sanitizedMessage)
    ) {
      await confirmAndPersistPolicy();
      return;
    }
    if (
      policyGenerationState.isActive &&
      /^\s*(make changes|edit|change answers|adjust)\b/i.test(sanitizedMessage)
    ) {
      // Re-open the dynamic form with the last schema
      setPolicyGenerationState((prev) => ({
        ...prev,
        generatedPolicy: null,
        isGenerating: false,
      }));
      const msg: Message = {
        role: 'assistant',
        content: 'Sure — update the fields and continue when ready.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      mutationKindRef.current = 'append';
      setMessages((prev) => [...prev, msg]);
      return;
    }

    const policyIntent = detectPolicyIntent(sanitizedMessage);
    // Only intercept when the user's request clearly specifies a policy type
    if (policyIntent === 'specified') {
      await handlePolicyGenerationFlow('specified', sanitizedMessage);
      return;
    }

    // Not a policy message: clear any stale policy UI state
    if (policyGenerationState.isActive) {
      setPolicyGenerationState({
        isActive: false,
        policyType: null,
        template: null,
        missingFields: [],
        currentFieldGroup: 0,
        userAnswers: {},
        generatedPolicy: null,
        isGenerating: false,
        formSchema: undefined,
        lastPdfUrl: null,
        schemaTitle: undefined,
        schemaGuidance: undefined,
      });
    }

    if (isEscalated) {
      await handleMessageToConsultant(sanitizedMessage);
      return;
    }

    // Heuristic: surface the contextual escalation card for high-risk keywords
    if (
      /\b(breach|incident|ransom|phish|malware|outage|downtime|compromise)\b/i.test(
        sanitizedMessage,
      )
    ) {
      setShowContextualEscalation(true);
      setEscalationRationale(
        'Potential high-risk terms detected. Consider escalation or immediate steps.',
      );
    } else {
      setShowContextualEscalation(false);
      setEscalationRationale(null);
    }

    // Build client-side attachment details for immediate UI rendering
    let attachedDetails:
      | Array<{ id: string; name: string; type?: string; size?: number }>
      | undefined;
    const usedDocIds =
      opts?.activeDocumentsOverride && opts.activeDocumentsOverride.length
        ? opts.activeDocumentsOverride
        : activeDocuments;

    // Ensure a conversation exists BEFORE sending, so routing and attachments stay consistent
    let convIdForSend: string | null = currentConversationId;
    if (!convIdForSend && user && !isDemo) {
      try {
        const title =
          sanitizedMessage && sanitizedMessage.length > 0
            ? sanitizedMessage.slice(0, 60)
            : 'New Conversation';
        const { data: newConv, error: convErr } = await supabase
          .from('chat_conversations')
          .insert({ user_id: user.id, title, tags: [] })
          .select()
          .single();
        if (!convErr && newConv) {
          // Prevent route-load effect from reloading while mid-send
          suppressNextRouteLoadRef.current = true;
          convIdForSend = newConv.id;
          setCurrentConversationId(newConv.id);
          setCurrentConversation({
            id: newConv.id,
            title: newConv.title,
            tags: newConv.tags || [],
          });
          // Route immediately so uploads (if any) can include conversation_id
          navigate(`/dashboard/chat/c/${newConv.id}`, { replace: true });
        }
      } catch (e) {
        console.warn('Failed to pre-create conversation before send:', e);
      }
    }
    if (opts?.activeDocumentsOverride && opts.activeDocumentsOverride.length) {
      const byId = new Map(uploadedDocuments.map((d: any) => [d.id, d]));
      attachedDetails = opts.activeDocumentsOverride
        .map((id) => byId.get(id))
        .filter(Boolean)
        .map((d: any) => ({
          id: d.id,
          name: d.file_name || d.title || 'Document',
          type: d.file_type,
          size: d.file_size,
        }));
      // If not found in uploadedDocuments yet (race), fallback to provided docMeta
      if (
        (!attachedDetails || attachedDetails.length === 0) &&
        Array.isArray((opts as any).docMetaOverride)
      ) {
        const meta = (opts as any).docMetaOverride as Array<{
          id: string;
          name: string;
          type?: string;
          size?: number;
        }>;
        const wanted = new Set(opts.activeDocumentsOverride);
        attachedDetails = meta.filter((m) => wanted.has(m.id)).slice(0, 3);
      }
    }

    const docsToIndex = (usedDocIds || []).filter((id) => !triggeredIndexDocsRef.current.has(id));
    if (docsToIndex.length > 0) {
      docsToIndex.forEach((id) => triggeredIndexDocsRef.current.add(id));
      docsToIndex.forEach((docId) => {
        void supabase.functions
          .invoke('qdrant-index', {
            body: {
              docId,
              conversationId: convIdForSend || currentConversationId || undefined,
            },
          })
          .catch((err) => console.warn('qdrant-index invoke failed:', err));
      });
    }

    // If attached docs are still indexing, inform the user (non-blocking)
    try {
      if (Array.isArray(usedDocIds) && usedDocIds.length > 0) {
        const byId = new Map(uploadedDocuments.map((d: any) => [d.id, d]));
        const hasCold = usedDocIds.some((id) => {
          const d: any = byId.get(id);
          if (!d) return false;
          const status = d.processing_status as string | undefined;
          const progress = Number(d.index_progress ?? 0);
          return status !== 'completed' && progress < 10;
        });
        if (hasCold) {
          toast({
            title: 'Indexing in progress',
            description:
              'We are still analyzing your document. Answers may be partial for a few seconds.',
          });
        }
      }
    } catch {}

    const userMessage: Message = {
      role: 'user',
      content: sanitizedMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      documents:
        opts?.documentNamesOverride && opts.documentNamesOverride.length
          ? opts.documentNamesOverride
          : undefined,
      images:
        opts?.imagePreviewsOverride && opts.imagePreviewsOverride.length
          ? opts.imagePreviewsOverride
          : undefined,
      metadata:
        attachedDetails && attachedDetails.length
          ? ({ attached_documents_details: attachedDetails } as any)
          : undefined,
    };
    mutationKindRef.current = 'append';
    setMessages((prev) => [...prev, userMessage]);

    const streamingMessageId = `streaming_${Date.now()}`;
    mutationKindRef.current = 'append';
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        id: streamingMessageId,
        isStreaming: true,
      },
    ]);

    setInput('');
    setMessageToSend('');
    // Bring the new streaming bubble into view once
    scrollToBottomAfterRender(true);

    setLoading(true);
    setConversationContext((prev) => ({ ...prev, messageCount: prev.messageCount + 1 }));

    const typingTimeout = setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === streamingMessageId ? { ...m, content: '' } : m)),
      );
    }, 150);

    let timeoutCleared = false;
    // Allow more time for first tokens from OpenAI; do not abort request.
    const chunkTimeout = setTimeout(() => {
      if (!timeoutCleared && !abortController?.signal.aborted) {
        toast({
          title: 'Still working…',
          description: 'This may take a bit longer for large documents.',
        });
      }
    }, 30000);
    setFirstChunkTimeout(chunkTimeout);

    const controller = new AbortController();
    setAbortController(controller);

    let firstChunkReceived = false;
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    // Helper: tolerant SSE payload extractor (accepts `data:{}` and `data: {}`)
    const getDataPayload = (line: string) => {
      if (!line.startsWith('data:')) return null;
      let payload = line.slice(5);
      if (payload.startsWith(' ')) payload = payload.slice(1);
      return payload.trim();
    };

    try {
      const response = await callFnStream('chat-with-ai', {
        method: 'POST',
        body: {
          content: sanitizedMessage,
          message: sanitizedMessage,
          conversationId: convIdForSend || currentConversationId || undefined,
          activeDocuments: (opts?.activeDocumentsOverride && opts.activeDocumentsOverride.length
            ? opts.activeDocumentsOverride
            : activeDocuments
          ).length
            ? opts?.activeDocumentsOverride && opts.activeDocumentsOverride.length
              ? opts.activeDocumentsOverride
              : activeDocuments
            : undefined,
          // Hint backend to use inline-docs for first-turn analysis with fresh uploads
          ...(opts?.preferInlineDocsFlag ? { preferInlineDocs: true } : {}),
          ...(opts?.imageAssetIdsOverride && opts.imageAssetIdsOverride.length
            ? { imageAssetIds: opts.imageAssetIdsOverride }
            : {}),
          isDemo: false,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        await response.text().catch(() => {});
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === streamingMessageId
              ? {
                  ...msg,
                  content: "I couldn't process that request. Please try again.",
                  isStreaming: false,
                }
              : msg,
          ),
        );
        setLoading(false);
        return;
      }

      reader = response.body?.getReader() ?? null;
      if (!reader) throw new Error('No reader available');

      let streamedContent = '';
      const decoder = new TextDecoder();
      let buffer = '';

      // --- tolerant SSE loop ---
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const rawLine of lines) {
          const line = rawLine.trim();
          const payload = getDataPayload(line);
          if (payload == null) continue;
          if (payload === '[DONE]') continue;

          try {
            const data = JSON.parse(payload);

            if (data.type === 'chunk') {
              clearTimeout(typingTimeout);
              if (!firstChunkReceived) {
                firstChunkReceived = true;
                timeoutCleared = true;
                if (firstChunkTimeout) {
                  clearTimeout(firstChunkTimeout);
                  setFirstChunkTimeout(null);
                }
              }

              const piece = data.content ?? '';
              if (piece) {
                streamedContent += piece;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === streamingMessageId ? { ...msg, content: streamedContent } : msg,
                  ),
                );
              }

              if (data.conversation_id && !currentConversationId) {
                setCurrentConversationId(data.conversation_id);
              }
              // no auto-follow here (user can scroll freely)
            } else if (data.type === 'complete') {
              const finalContent = streamedContent;

              // Map server-provided followups/extras if present
              const serverSuggestions = Array.isArray(data.suggestions)
                ? (data.suggestions as string[])
                : undefined;
              const serverNextActions = Array.isArray(data.next_actions)
                ? (data.next_actions as string[])
                : undefined;
              const serverFrameworkTags = Array.isArray(data.framework_tags)
                ? (data.framework_tags as string[])
                : undefined;
              const serverRiskLevel =
                typeof data.risk_level === 'string' ? (data.risk_level as string) : undefined;

              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.id !== streamingMessageId) return msg;
                  return {
                    ...msg,
                    content: finalContent,
                    isStreaming: false,
                    // Show server suggestions if available; fallback to a small default set
                    suggestions:
                      serverSuggestions && serverSuggestions.length > 0
                        ? serverSuggestions
                        : [
                            'Tell me more about this',
                            'What are the next steps?',
                            'How do I implement this?',
                          ],
                    documents: uploadedDocuments.slice(0, 2).map((doc) => doc.title),
                    metadata: {
                      ...(msg.metadata || {}),
                      next_actions: serverNextActions || (msg.metadata as any)?.next_actions,
                      framework_tags:
                        serverFrameworkTags || (msg.metadata as any)?.framework_tags || [],
                      risk_level: serverRiskLevel || (msg.metadata as any)?.risk_level,
                    },
                  } as any;
                }),
              );

              const newConvId = data.conversation_id || currentConversationId;
              if (newConvId && (!currentConversationId || currentConversationId !== newConvId)) {
                suppressNextRouteLoadRef.current = true;
                setCurrentConversationId(newConvId);
                navigate(`/dashboard/chat/c/${newConvId}`, { replace: true });
              }
              if (data.title) {
                setCurrentConversation({ id: newConvId!, title: data.title, tags: [] });
              }

              if (newConvId) {
                const realId = await hydrateAssistantId(newConvId);
                if (realId) {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === streamingMessageId ? { ...msg, id: realId } : msg,
                    ),
                  );
                }
              }

              await loadConversations();

              setLoading(false);
              setAbortController(null);
              // Count assistant reply too (helps triggers)
              setConversationContext((prev) => ({
                ...prev,
                messageCount: prev.messageCount + 1,
              }));
              return;
            } else if (data.type === 'error') {
              throw new Error(data.error);
            }
          } catch {
            // ignore heartbeat/non-JSON
          }
        }
      }

      // If we streamed nothing, provide a gentle nudge
      if (streamedContent.trim() === '') {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id?.startsWith('streaming_')
              ? {
                  ...msg,
                  content: 'Could you clarify your question or provide more detail?',
                  isStreaming: false,
                }
              : msg,
          ),
        );
        setLoading(false);
        setAbortController(null);
        return;
      }
    } catch (error: any) {
      clearTimeout(typingTimeout);
      if (firstChunkTimeout) {
        clearTimeout(firstChunkTimeout);
        setFirstChunkTimeout(null);
      }

      try {
        await reader?.cancel();
      } catch {}

      setLoading(false);
      setAbortController(null);

      const fallbackContent =
        error?.name === 'AbortError'
          ? 'Response generation was cancelled. Please try again.'
          : error?.message?.includes('timeout') || error?.message?.includes('network')
            ? 'Connection timeout. Please check your internet and try again.'
            : error?.message?.includes('500') || error?.message?.includes('503')
              ? 'Our service is temporarily busy. Please try again in a moment.'
              : error?.message?.includes('429')
                ? 'Too many requests. Please wait a moment and try again.'
                : retryCount > 0
                  ? "I'm still having trouble. Please try rephrasing your question or contact support."
                  : 'I encountered an issue processing your request. Please try again.';

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id?.startsWith('streaming_')
            ? { ...msg, content: fallbackContent, isStreaming: false }
            : msg,
        ),
      );

      setInput(raw);
      setMessageToSend('');
    }
  };

  // Save policy via edge function, then generate PDF via export-policy and post a link
  const confirmAndPersistPolicy = async () => {
    const pg = policyGenerationState;
    if (!pg.generatedPolicy || !pg.policyType) return;
    try {
      // Persist user's confirmation as a message
      try {
        const convId = currentConversationId || lastCreatedConvRef.current;
        if (convId) {
          await supabase
            .from('chat_messages')
            .insert({ conversation_id: convId, role: 'user', content: 'Proceed with this draft' });
        }
      } catch {}

      // Save to DB
      const title =
        pg.schemaTitle && pg.schemaTitle.trim()
          ? pg.schemaTitle.trim()
          : pg.policyType
            ? POLICY_TEMPLATES[pg.policyType].title
            : 'Policy';
      const { data: saved, error } = await supabase.functions.invoke('save-policy', {
        body: {
          title,
          content: pg.generatedPolicy,
          policyType: pg.policyType,
          templateUsed: pg.policyType,
        },
      });
      if (error) throw error;

      // Export PDF (server function returns a file response; fetch and create blob URL)
      const res = await fetch('/functions/v1/export-policy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(supabase.auth.getSession ? {} : {}),
          Authorization: (await supabase.auth.getSession()).data.session?.access_token
            ? `Bearer ${(await supabase.auth.getSession()).data.session!.access_token}`
            : '',
        },
        body: JSON.stringify({ messageId: 'unused', format: 'pdf', policyType: pg.policyType }),
      });
      if (!res.ok) throw new Error('Failed to export policy');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      setPolicyGenerationState((prev) => ({ ...prev, lastPdfUrl: url }));

      const doneMsg: Message = {
        role: 'assistant',
        content:
          'Saved your policy. Download the PDF below. You can also export Word from the toolbar.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      mutationKindRef.current = 'append';
      setMessages((prev) => [
        ...prev,
        doneMsg,
        {
          role: 'assistant',
          content: `[Download PDF](${url})`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      // Persist assistant confirmation and link
      try {
        const convId = currentConversationId || lastCreatedConvRef.current;
        if (convId) {
          await supabase.from('chat_messages').insert([
            {
              conversation_id: convId,
              role: 'assistant',
              content: doneMsg.content,
              metadata: { type: 'policy_saved' },
            },
            {
              conversation_id: convId,
              role: 'assistant',
              content: `[Download PDF](${url})`,
              metadata: { type: 'policy_pdf_link' },
            },
          ]);
        }
      } catch {}
      toast({
        title: 'Policy saved',
        description: 'View it in Policies. A PDF download is ready.',
      });
    } catch (e) {
      console.error('Persist/export failed:', e);
      toast({
        title: 'Action failed',
        description: 'Could not save or export policy',
        variant: 'destructive',
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ----- Derived lists -----
  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) => {
      const matchesSearch =
        searchTerm === '' ||
        conv.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (conv.tags || []).some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesTag = selectedTag === 'all' || (conv.tags || []).includes(selectedTag);
      return matchesSearch && matchesTag;
    });
  }, [conversations, searchTerm, selectedTag]);

  const allTags = useMemo(
    () => [...new Set(conversations.flatMap((conv) => conv.tags || []))],
    [conversations],
  );

  const userFirstName =
    user?.user_metadata?.first_name ||
    user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'there';

  const timeOfDay = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  })();

  const suggestedPrompts = [
    'Create a HIPAA compliance checklist for our practice',
    'Generate a Password Management Policy aligned with SOC 2.',
    'Help me understand SOC 2 requirements',
    'Review our password policy for compliance',
  ];

  const loadConversation = (conversationId: string) => {
    if (conversationId === currentConversationId) return;
    navigate(`/dashboard/chat/c/${conversationId}`);
  };

  return {
    // layout/refs
    sidebarCollapsed,
    messagesEndRef,
    messagesContainerRef,
    topSentinelRef,
    inputRef,
    composerRef,

    // data
    messages,
    setMessages,
    input,
    setInput,
    messageToSend,
    setMessageToSend,
    loading,
    abortController,
    conversations,
    currentConversation,
    currentConversationId,
    setCurrentConversationId,
    showChatHistory,
    setShowChatHistory,
    searchTerm,
    setSearchTerm,
    selectedTag,
    setSelectedTag,
    filteredConversations,
    allTags,
    uploadedDocuments,
    activeDocuments,
    setActiveDocuments,
    indexingBlocked,
    indexingHint,
    showDocumentUpload,
    setShowDocumentUpload,
    isNearBottom,
    showNewMessageIndicator,
    sessionStart,
    conversationContext,
    policyGenerationState,
    setPolicyGenerationState,
    isEscalated,
    setIsEscalated,
    showContextualEscalation,
    setShowContextualEscalation,
    escalationRationale,
    setEscalationRationale,

    user,
    userFirstName,
    timeOfDay,
    suggestedPrompts,
    isDemo,

    // pagination/loading
    initialLoading,
    olderLoading,
    hasMoreOlder,

    // actions
    loadConversation,
    loadConversations,
    startNewConversation,
    deleteConversation,
    handleDocumentUploaded,
    scrollToBottom,
    handleScroll,
    scrollToBottomAndMarkRead,
    handleSendMessage,
    handleKeyPress,
    handleRetry,
    handleStopGeneration,
    sendMessageWithDocuments,
    sendImagesMessage,
    copyMessage,
    handleMessageReaction,
    handleSuggestionClick,
    updateConversationTitle,
    startEditingTitle,
    cancelEditingTitle,
    saveTitle,

    // title editing state
    editingTitle,
    editTitleValue,
    setEditTitleValue,

    handlePolicyFieldsSubmit,
    handlePolicyUseDefaults,
  };
}

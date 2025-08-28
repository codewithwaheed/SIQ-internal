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
  analyzePolicyRequirements,
  generatePolicy,
  getPolicyTypeFromInput,
  POLICY_TEMPLATES,
  type PolicyType,
} from '@/lib/policyGenerator';
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
  const hasAnchoredBottomRef = useRef(false);
  const reachedTopRef = useRef(false);
  const mutationKindRef = useRef<'prepend' | 'append' | null>(null);

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

    try {
      const { data } = await callFn<{
        messages: any[];
        page?: { next_before: string | null; has_more: boolean };
      }>(`chat-api/conversations/${conversationId}/messages?limit=20`, { method: 'GET' });

      const loaded = (data?.messages || []).map((m: any) => ({
        role: (m.role === 'consultant' ? 'assistant' : m.role) as 'user' | 'assistant',
        content: m.content,
        timestamp: new Date(m.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        id: m.id,
      })) as Message[];

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
    setUploadedDocuments((prev) => [document, ...prev]);
    setActiveDocuments((prev) => [...prev, document.id]);
    setConversationContext((prev) => ({ ...prev, documentCount: prev.documentCount + 1 }));
    toast({
      title: 'Document uploaded',
      description: 'Your document is now available for AI analysis in future conversations.',
    });
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
    const userChatMessage: Message = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    mutationKindRef.current = 'append';
    setMessages((prev) => [...prev, userChatMessage]);
    setInput('');
    setMessageToSend('');

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
      const template = await loadPolicyTemplate(policyType);
      const userProfile = user
        ? {
            business_name: user.user_metadata?.company_name || 'Your Organization',
            policy_title: customTitle || POLICY_TEMPLATES[policyType].title,
          }
        : { policy_title: customTitle || POLICY_TEMPLATES[policyType].title };

      const requirements = await analyzePolicyRequirements(template, userProfile);

      setPolicyGenerationState({
        isActive: true,
        policyType,
        template,
        missingFields: requirements.missingFields,
        currentFieldGroup: 0,
        userAnswers: {},
        generatedPolicy: null,
        isGenerating: false,
      });

      if (requirements.missingFields.length === 0) {
        await generatePolicyDocument(template, userProfile, {});
      }
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
    const userProfile = user
      ? { business_name: user.user_metadata?.company_name || 'Your Organization' }
      : {};
    setPolicyGenerationState((prev) => ({ ...prev, userAnswers: updatedAnswers }));

    try {
      if (policyGenerationState.template) {
        const requirements = await analyzePolicyRequirements(
          policyGenerationState.template,
          userProfile,
          updatedAnswers,
        );
        if (requirements.missingFields.length === 0) {
          await generatePolicyDocument(policyGenerationState.template, userProfile, updatedAnswers);
        } else {
          setPolicyGenerationState((prev) => ({
            ...prev,
            missingFields: requirements.missingFields,
          }));
        }
      }
    } catch (err) {
      console.error('Error analyzing policy requirements:', err);
      toast({
        title: 'Error',
        description: 'Unable to process your answers. Try again.',
        variant: 'destructive',
      });
    }
  };

  const handlePolicyUseDefaults = async () => {
    const userProfile = user
      ? { business_name: user.user_metadata?.company_name || 'Your Organization' }
      : {};
    if (policyGenerationState.template) {
      await generatePolicyDocument(policyGenerationState.template, userProfile, {});
    }
  };

  const generatePolicyDocument = async (
    template: string,
    userProfile: Record<string, any>,
    answers: Record<string, string>,
  ) => {
    setPolicyGenerationState((prev) => ({ ...prev, isGenerating: true }));
    try {
      const result = generatePolicy(template, userProfile, answers);
      const policyMessage: Message = {
        role: 'assistant',
        content: result.policy,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        metadata: { risk_level: 'low', framework_tags: ['policy', 'governance'], confidence: 0.95 },
      };
      mutationKindRef.current = 'append';
      setMessages((prev) => [...prev, policyMessage]);
      setPolicyGenerationState((prev) => ({
        ...prev,
        generatedPolicy: result.policy,
        isGenerating: false,
        isActive: true,
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
  const handleSendMessage = async () => {
    if (loading) return;

    const raw = input.trim().length ? input : messageToSend.trim();
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

    const policyIntent = detectPolicyIntent(sanitizedMessage);
    if (policyIntent !== 'none') {
      await handlePolicyGenerationFlow(policyIntent, sanitizedMessage);
      return;
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

    const userMessage: Message = {
      role: 'user',
      content: sanitizedMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
    const chunkTimeout = setTimeout(() => {
      if (!timeoutCleared && !abortController?.signal.aborted) {
        if (abortController) abortController.abort();
        setLoading(false);
        setFirstChunkTimeout(null);
        toast({
          title: 'Server busy',
          description: 'Please try again in a moment.',
          variant: 'destructive',
          action: { label: 'Retry', onClick: () => handleRetry(sanitizedMessage) } as any,
        });
      }
    }, 10000);
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
          conversationId: currentConversationId || undefined,
          userId: user?.id,
          activeDocuments: activeDocuments.length ? activeDocuments : undefined,
          conversation: messages.slice(-8).map((m) => ({ role: m.role, content: m.content })),
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
    'Generate an incident response plan',
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

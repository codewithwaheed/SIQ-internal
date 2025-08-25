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

export function useAiChatController(isDemo: boolean) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ conversationId?: string }>();

  const { state: sidebarState } = useSidebar();
  const sidebarCollapsed = sidebarState === 'collapsed';

  const { toast } = useToast();
  const { user } = useAuth();
  const { validateMessage, checkAuthentication, validateSession } = useChatSecurity();
  const { messages: realTimeMessages } = useRealTimeChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);

  const [searchParams, setSearchParams] = useSearchParams();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [messageToSend, setMessageToSend] = useState('');
  const [loading, setLoading] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [firstChunkTimeout, setFirstChunkTimeout] = useState<NodeJS.Timeout | null>(null);

  // pagination + loading states
  const [initialLoading, setInitialLoading] = useState(false);
  const [olderLoading, setOlderLoading] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [beforeCursor, setBeforeCursor] = useState<string | null>(null);
  // NEW: don't let the top sentinel trigger until we've scrolled to bottom once
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

  // prevent flicker when navigating after streaming
  const suppressNextRouteLoadRef = useRef(false);
  // avoid reloading on focus for same conversation
  const lastLoadedConvRef = useRef<string | null>(null);
  // detect returning from ChatHistory (to auto-scroll bottom)
  const prevShowHistoryRef = useRef<boolean>(false);

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

  // Bind composer auto-height
  useEffect(() => {
    if (composerRef.current) return bindComposerHeight(composerRef.current);
  }, []);

  // Arm pagination after we leave ChatHistory view
  useEffect(() => {
    if (prevShowHistoryRef.current && !showChatHistory) {
      // Returning from history ➜ jump to bottom immediately, then arm pagination
      scrollToBottomAfterRender(false);
      setTimeout(() => setPaginationArmed(true), 120);
    }
    prevShowHistoryRef.current = showChatHistory;
  }, [showChatHistory]);

  // ?new=true compatibility
  useEffect(() => {
    const newParam = searchParams.get('new');
    if (newParam === 'true') {
      startNewConversation();
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // track assistant count
  useEffect(() => {
    if (messages.filter((m) => m.role === 'assistant').length > lastAssistantReplyCount) {
      setLastAssistantReplyCount(messages.filter((m) => m.role === 'assistant').length);
    }
  }, [messages, lastAssistantReplyCount]);

  // auto-scroll when near bottom
  useEffect(() => {
    if (isNearBottom) {
      scrollToBottom({ smooth: true });
      setShowNewMessageIndicator(false);
    } else if (messages.length > 0) {
      setShowNewMessageIndicator(true);
    }
  }, [messages, isNearBottom]);

  // Initial boot + route-based load
  useEffect(() => {
    if (!user || isDemo) return;

    // load side data
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
        // Ensure bottom without animation; arm pagination after
        setTimeout(() => {
          scrollToBottom({ smooth: false });
          setTimeout(() => setPaginationArmed(true), 120);
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
  }, [user, isDemo, location.pathname, params.conversationId]);

  // auto-resize input
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  // -------- IntersectionObserver for top sentinel (robust "load older") --------
  useEffect(() => {
    const root = messagesContainerRef.current;
    const sentinel = topSentinelRef.current;
    if (!root || !sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (!paginationArmed || initialLoading || olderLoading || !hasMoreOlder) return;

        // Only when the user is actually near the top
        const scrollTop = root.scrollTop;
        if (entry.isIntersecting && scrollTop <= 40) {
          loadOlderMessages();
        }
      },
      {
        root,
        rootMargin: '0px 0px 0px 0px', // no early prefetch on initial render
        threshold: 0.01,
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMoreOlder, olderLoading, initialLoading, paginationArmed]);

  // ----- data loaders -----
  const loadUserDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('uploaded_at', { ascending: false });
      if (!error) setUploadedDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const loadConversations = async () => {
    try {
      const { data } = await callFn<{ conversations: Conversation[]; pagination: any }>(
        'chat-api/conversations?limit=200&offset=0',
        { method: 'GET' },
      );
      setConversations(data?.conversations || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  // helper: scroll after paint (optionally smooth)
  const scrollToBottomAfterRender = (smooth = true) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollToBottom({ smooth }));
    });
  };

  const openConversationByRoute = async (conversationId: string) => {
    setInitialLoading(true);
    setPaginationArmed(false); // disarm while we switch convs
    setMessages([]);
    setCurrentConversationId(conversationId);
    setBeforeCursor(null);
    setHasMoreOlder(false);

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

      const conv = conversations.find((c) => c.id === conversationId) || null;
      if (conv) setCurrentConversation({ id: conv.id, title: conv.title, tags: conv.tags || [] });

      lastLoadedConvRef.current = conversationId;

      // End initial load, jump to bottom (no animation), then arm pagination
      setInitialLoading(false);
      scrollToBottomAfterRender(false);
      setTimeout(() => setPaginationArmed(true), 120);
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
  };

  const loadOlderMessages = async () => {
    if (!currentConversationId || !beforeCursor || olderLoading) return;
    setOlderLoading(true);

    const container = messagesContainerRef.current;
    const prevScrollHeight = container?.scrollHeight ?? 0;
    const prevScrollTop = container?.scrollTop ?? 0;

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

      const older = (data?.messages || []).map((m: any) => ({
        role: (m.role === 'consultant' ? 'assistant' : m.role) as 'user' | 'assistant',
        content: m.content,
        timestamp: new Date(m.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        id: m.id,
      })) as Message[];

      setMessages((prev) => [...older, ...prev]);
      setBeforeCursor(data?.page?.next_before ?? null);
      setHasMoreOlder(!!data?.page?.has_more);

      // keep viewport anchored at the same message
      setTimeout(() => {
        const newScrollHeight = container?.scrollHeight ?? 0;
        if (container) container.scrollTop = newScrollHeight - prevScrollHeight + prevScrollTop;
      }, 0);
    } catch (e) {
      console.error('Failed to load older messages', e);
    } finally {
      setOlderLoading(false);
    }
  };

  // ----- UI helpers -----
  const scrollToBottom = (opts?: { smooth?: boolean }) =>
    messagesEndRef.current?.scrollIntoView({
      behavior: opts?.smooth === false ? 'auto' : 'smooth',
    });

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const el = messagesContainerRef.current;

    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setIsNearBottom(nearBottom);
    if (nearBottom) setShowNewMessageIndicator(false);

    // Fallback trigger if someone scrolls fast to the very top
    if (paginationArmed && el.scrollTop < 60 && hasMoreOlder && !olderLoading && !initialLoading) {
      loadOlderMessages();
    }
  };

  const scrollToBottomAndMarkRead = () => {
    scrollToBottom({ smooth: true });
    setShowNewMessageIndicator(false);
    setIsNearBottom(true);
  };

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

    if (location.pathname !== '/dashboard/chat/new') {
      navigate('/dashboard/chat/new', { replace: true });
    }
  };

  const deleteConversation = async (conversationId: string) => {
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
  };

  const handleDocumentUploaded = (document: any) => {
    setUploadedDocuments((prev) => [document, ...prev]);
    setActiveDocuments((prev) => [...prev, document.id]);
    setConversationContext((prev) => ({ ...prev, documentCount: prev.documentCount + 1 }));
    toast({
      title: 'Document uploaded',
      description: 'Your document is now available for AI analysis in future conversations.',
    });
  };

  const handleMessageToConsultant = async (messageContent: string) => {
    const userMessage: Message = {
      role: 'user',
      content: messageContent,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
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
  };

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
    await new Promise((r) => setTimeout(r, Math.pow(2, retryCount) * 1000));
    handleSendMessage();
  };

  const handleStopGeneration = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
  };

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
    inputRef.current?.focus();
  };

  const updateConversationTitle = async (newTitle: string, newTags: string[]) => {
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
  };

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
    setMessages((prev) => [...prev, userChatMessage]);
    setInput('');

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
  // ---------- Policy helpers END ----------

  // hydrate: fetch the real assistant message id after streaming completes
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
    } catch {
      // ignore
    }
    return undefined;
  };

  // ----- Send message (streaming) -----
  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    if (!checkAuthentication()) {
      window.location.href = '/auth';
      return;
    }
    if (!(await validateSession())) return;

    const inputMessage = messageToSend || input;

    if (!inputMessage || inputMessage.trim().length < 2) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter at least 2 characters.',
        variant: 'destructive',
      });
      return;
    }

    const validation = validateMessage(inputMessage);
    if (!validation.isValid) {
      toast({
        title: 'Invalid Message',
        description: validation.threats.join(', '),
        variant: 'destructive',
      });
      return;
    }
    const sanitizedMessage = validation.sanitizedContent || inputMessage;
    if (!sanitizedMessage || sanitizedMessage.trim().length < 3) {
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

    const userMessage: Message = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMessage]);

    const streamingMessageId = `streaming_${Date.now()}`;
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
          action: { label: 'Retry', onClick: () => handleRetry(inputMessage) } as any,
        });
      }
    }, 10000);
    setFirstChunkTimeout(chunkTimeout);

    const controller = new AbortController();
    setAbortController(controller);

    let firstChunkReceived = false;
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    try {
      const response = await callFnStream('chat-with-ai', {
        method: 'POST',
        body: {
          content: inputMessage,
          message: inputMessage,
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

      const autoScrollIfAtBottom = () => {
        if (isNearBottom && messagesContainerRef.current)
          setTimeout(() => scrollToBottom({ smooth: true }), 50);
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value);
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ') || line.trim() === 'data: [DONE]') continue;

          try {
            const data = JSON.parse(line.slice(6));

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

              streamedContent += data.content || '';
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === streamingMessageId ? { ...msg, content: streamedContent } : msg,
                ),
              );

              if (data.conversation_id && !currentConversationId) {
                setCurrentConversationId(data.conversation_id);
              }

              autoScrollIfAtBottom();
            } else if (data.type === 'complete') {
              const finalContent = streamedContent;

              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === streamingMessageId
                    ? {
                        ...msg,
                        content: finalContent,
                        isStreaming: false,
                        suggestions: data?.suggestions ?? [
                          'Tell me more about this',
                          'What are the next steps?',
                          'How do I implement this?',
                        ],
                        documents: uploadedDocuments.slice(0, 2).map((doc) => doc.title),
                        metadata:
                          data?.risk_level || data?.framework_tags || data?.next_actions
                            ? {
                                risk_level: data?.risk_level,
                                framework_tags: data?.framework_tags,
                                next_actions: data?.next_actions,
                              }
                            : undefined,
                      }
                    : msg,
                ),
              );

              const newConvId = data.conversation_id || currentConversationId;
              if (newConvId && (!currentConversationId || currentConversationId !== newConvId)) {
                suppressNextRouteLoadRef.current = true;
                setCurrentConversationId(newConvId);
                navigate(`/dashboard/chat/c/${newConvId}`, { replace: true });
              }
              if (data.title) {
                setCurrentConversation({
                  id: newConvId!,
                  title: data.title,
                  tags: [],
                });
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

              return;
            } else if (data.type === 'error') {
              throw new Error(data.error);
            }
          } catch {
            // ignore non-JSON
          }
        }
      }

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

      setConversationContext((prev) => ({ ...prev, messageCount: prev.messageCount + 1 }));
      setTimeout(() => scrollToBottom({ smooth: true }), 100);
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

      setInput(messageToSend || input);
    }
  };

  // Enter to send
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

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
    sidebarCollapsed,
    messagesEndRef,
    messagesContainerRef,
    topSentinelRef,
    inputRef,
    composerRef,

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
    editingTitle,
    editTitleValue,

    setEditTitleValue,
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

    // policy handlers
    handlePolicyFieldsSubmit,
    handlePolicyUseDefaults,
  };
}

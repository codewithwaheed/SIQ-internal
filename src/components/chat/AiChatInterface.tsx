import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowUp, History, Search, X, Edit3, Check, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DocumentUpload } from './DocumentUpload';
import { EscalationIntakeForm } from './EscalationIntakeForm';
import { ChatMessage } from './ChatMessage';
import { MessageInputBox } from './MessageInputBox';
import { ContextManager } from './ContextManager';
import { SensitiveDataDetector } from './SensitiveDataDetector';
import { SmartEscalationTriggers } from './SmartEscalationTriggers';
import { PersistentEscalationCTA } from './PersistentEscalationCTA';
import { InlineUpgradeNudge } from '@/components/ui/feature-gate';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AiAvatar } from '@/components/ui/ai-avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ContextualEscalationCard, useEscalationTrigger } from './ContextualEscalationCard';
import { PolicyGenerationInterface } from './PolicyGenerationInterface';
import { useSidebar } from '@/components/ui/sidebar';
import {
  detectPolicyIntent,
  loadPolicyTemplate,
  analyzePolicyRequirements,
  generatePolicy,
  getPolicyTypeFromInput,
  POLICY_TEMPLATES,
  type PolicyType,
} from '@/lib/policyGenerator';
import { bindComposerHeight } from '@/lib/composer-sizing';
import { useChatSecurity } from '@/hooks/useChatSecurity';
import { useRealTimeChat } from '@/hooks/useRealTimeChat';

// 🔐 functions helpers (adds Authorization/apikey automatically)
import { callFn, callFnStream } from '@/lib/call-fn';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  id?: string;
  suggestions?: string[];
  documents?: string[];
  isStreaming?: boolean;
  metadata?: {
    risk_level?: string;
    framework_tags?: string[];
    confidence?: number;
    escalate_recommendation?: boolean;
    escalation_reason?: string;
    next_actions?: string[];
    escalated?: boolean;
    ai_triggered?: boolean;
    estimated_wait_time?: string;
    consultant_reply?: boolean;
  };
}

interface Conversation {
  id: string;
  title: string;
  tags: string[];
  updated_at: string;
  created_at: string;
}

interface CurrentConversation {
  id: string;
  title: string;
  tags: string[];
}

interface AiChatInterfaceProps {
  isDemo?: boolean;
  className?: string;
}

export const AiChatInterface = ({ isDemo = false, className = '' }: AiChatInterfaceProps) => {
  const { state: sidebarState } = useSidebar();
  const sidebarCollapsed = sidebarState === 'collapsed';

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [firstChunkTimeout, setFirstChunkTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);
  const [activeDocuments, setActiveDocuments] = useState<string[]>([]);
  const [isEscalated, setIsEscalated] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [currentConversation, setCurrentConversation] = useState<CurrentConversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showNewMessageIndicator, setShowNewMessageIndicator] = useState(false);
  const [sessionStart] = useState(new Date());
  const [conversationContext, setConversationContext] = useState<{
    documentCount: number;
    messageCount: number;
  }>({ documentCount: 0, messageCount: 0 });
  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { validateMessage, checkAuthentication, validateSession } = useChatSecurity();
  const {
    messages: realTimeMessages,
    isConnected: isRealTimeConnected,
    subscribeToConversation,
    unsubscribeFromConversation,
    addLocalMessage,
  } = useRealTimeChat();
  const [searchParams, setSearchParams] = useSearchParams();
  const [lastAssistantReplyCount, setLastAssistantReplyCount] = useState(0);
  const [showContextualEscalation, setShowContextualEscalation] = useState(false);
  const [escalationRationale, setEscalationRationale] = useState<string | null>(null);
  const [messageToSend, setMessageToSend] = useState('');

  const [policyGenerationState, setPolicyGenerationState] = useState<{
    isActive: boolean;
    policyType: PolicyType | null;
    template: string | null;
    missingFields: string[];
    currentFieldGroup: number;
    userAnswers: Record<string, string>;
    generatedPolicy: string | null;
    isGenerating: boolean;
  }>({
    isActive: false,
    policyType: null,
    template: null,
    missingFields: [],
    currentFieldGroup: 0,
    userAnswers: {},
    generatedPolicy: null,
    isGenerating: false,
  });

  // Bind composer height
  useEffect(() => {
    if (composerRef.current) {
      const cleanup = bindComposerHeight(composerRef.current);
      return cleanup;
    }
  }, []);

  // New chat via ?new=true
  useEffect(() => {
    const newParam = searchParams.get('new');
    if (newParam === 'true') {
      setMessages([]);
      setInput('');
      setCurrentConversation(null);
      setCurrentConversationId(null);
      setActiveDocuments([]);
      setShowChatHistory(false);
      setShowDocumentUpload(false);
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Escalation triggers
  useEffect(() => {
    const escalationTrigger = useEscalationTrigger(messages, lastAssistantReplyCount);
    if (escalationTrigger.shouldShow) {
      setShowContextualEscalation(true);
      setEscalationRationale(escalationTrigger.rationale);
      setLastAssistantReplyCount(messages.filter((m) => m.role === 'assistant').length);
    }
  }, [messages, lastAssistantReplyCount]);

  // Smart scrolling
  useEffect(() => {
    if (isNearBottom) {
      scrollToBottom();
      setShowNewMessageIndicator(false);
    } else if (messages.length > 0) {
      setShowNewMessageIndicator(true);
    }
  }, [messages, isNearBottom]);

  // Load docs & conversations
  useEffect(() => {
    if (user && !isDemo) {
      loadUserDocuments();
      loadConversations();
      const conversationId = searchParams.get('conversation');
      if (conversationId) {
        loadConversation(conversationId);
        setSearchParams({});
      }
    }
  }, [user, isDemo, searchParams]);

  const loadUserDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('uploaded_at', { ascending: false });
      if (error) {
        console.error('Error loading documents:', error);
      } else {
        setUploadedDocuments(data || []);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  // ✅ Load ALL conversations via chat-api (Edge Function)
  const loadConversations = async () => {
    try {
      const { data, error } = await callFn<{ conversations: Conversation[]; pagination: any }>(
        'chat-api/conversations?limit=200&offset=0',
        { method: 'GET' },
      );
      if (error) {
        console.error('Error loading conversations:', error);
      } else {
        setConversations(data?.conversations || []);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  // ✅ Load a conversation’s messages via chat-api
  const loadConversation = async (conversationId: string) => {
    try {
      const { data, error } = await callFn<{ messages: any[] }>(
        `chat-api/conversations/${conversationId}/messages`,
        { method: 'GET' },
      );
      if (error) throw error;

      const loadedMessages: Message[] = (data?.messages || []).map((msg) => ({
        role: (msg.role === 'consultant' ? 'assistant' : msg.role) as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        id: msg.id,
      }));

      setMessages(loadedMessages);
      setCurrentConversationId(conversationId);
      setShowChatHistory(false);
    } catch (error) {
      console.error('Error loading conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to load conversation.',
        variant: 'destructive',
      });
    }
  };

  const startNewConversation = () => {
    setMessages([]);
    setCurrentConversationId(null);
    setCurrentConversation(null);
    setShowChatHistory(false);
    setEditingTitle(false);
    setEditTitleValue('');
  };

  // Keep your direct delete (no chat-api delete endpoint right now)
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
      className: 'message-success',
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;
    setIsNearBottom(isAtBottom);
    if (isAtBottom) setShowNewMessageIndicator(false);
  };

  const scrollToBottomAndMarkRead = () => {
    scrollToBottom();
    setShowNewMessageIndicator(false);
    setIsNearBottom(true);
  };

  // Escalation -> send message to the same messages endpoint (role inferred by server)
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

  // Poll for consultant messages if escalated
  useEffect(() => {
    if (!isEscalated || !currentConversationId) return;
    const poll = setInterval(async () => {
      try {
        const { data } = await callFn<{ messages: any[] }>(
          `chat-api/conversations/${currentConversationId}/messages`,
          { method: 'GET' },
        );
        const all = data?.messages || [];
        if (!all.length) return;

        const latest = all[all.length - 1];
        const lastMsg = messages[messages.length - 1];
        if (latest && latest.role === 'consultant' && (!lastMsg || lastMsg.id !== latest.id)) {
          const newMessage: Message = {
            role: 'assistant',
            content: latest.content,
            timestamp: new Date(latest.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            id: latest.id,
            metadata: { escalated: true, consultant_reply: true },
          };
          setMessages((prev) =>
            prev.some((m) => m.id === newMessage.id) ? prev : [...prev, newMessage],
          );
        }
      } catch (e) {
        console.error('Polling consultant messages failed:', e);
      }
    }, 3000);
    return () => clearInterval(poll);
  }, [isEscalated, currentConversationId, messages]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

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

    // Policy intent?
    const policyIntent = detectPolicyIntent(sanitizedMessage);
    if (policyIntent !== 'none') {
      await handlePolicyGenerationFlow(policyIntent, sanitizedMessage);
      return;
    }

    if (isEscalated) {
      await handleMessageToConsultant(sanitizedMessage);
      return;
    }

    // User message
    const userMessage: Message = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Streaming placeholder
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
          action: (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRetry(inputMessage, streamingMessageId)}
            >
              Retry
            </Button>
          ),
        });
      }
    }, 10000);
    setFirstChunkTimeout(chunkTimeout);

    const controller = new AbortController();
    setAbortController(controller);

    let firstChunkReceived = false;
    try {
      const response = await callFnStream('chat-with-ai', {
        method: 'POST',
        body: {
          content: inputMessage,
          message: inputMessage,
          conversationId: currentConversationId || undefined,
          userId: user?.id,
          activeDocuments: activeDocuments.length ? activeDocuments : undefined,
          // if your schema expects an array of {role, content}, trim/normalize here if needed:
          conversation: messages.slice(-8).map((m) => ({ role: m.role, content: m.content })),
          isDemo: false,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Error');
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

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      let streamedContent = '';
      const decoder = new TextDecoder();
      let buffer = '';

      const autoScrollIfAtBottom = () => {
        if (isNearBottom && messagesContainerRef.current) {
          setTimeout(() => scrollToBottom(), 50);
        }
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

              // Adopt conversation id as soon as the stream gives it
              if (data.conversation_id && !currentConversationId) {
                setCurrentConversationId(data.conversation_id);
              }

              autoScrollIfAtBottom();
            } else if (data.type === 'escalated') {
              clearTimeout(typingTimeout);
              setLoading(false);
              setAbortController(null);

              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === streamingMessageId
                    ? {
                        ...msg,
                        content:
                          data.response ||
                          'Your request has been escalated to our cybersecurity experts.',
                        isStreaming: false,
                        metadata: {
                          escalated: true,
                          ai_triggered: data.ai_triggered,
                          estimated_wait_time: data.estimated_wait_time,
                        },
                      }
                    : msg,
                ),
              );

              toast({
                title: data.ai_triggered ? 'Escalated to Expert' : 'Connected to Expert',
                description: data.estimated_wait_time
                  ? `Estimated response time: ${data.estimated_wait_time}`
                  : 'An expert will respond shortly',
                className: 'message-success',
              });

              if (!isDemo) loadConversations();
              return;
            } else if (data.type === 'complete') {
              // finalize
              const finalContent = streamedContent;
              const parsedMetadata = data.structured_response
                ? {
                    risk_level: data.structured_response.risk_level,
                    framework_tags: data.structured_response.framework_tags || [],
                    confidence: data.structured_response.confidence,
                    escalate_recommendation: data.structured_response.escalate_recommendation,
                    escalation_reason: data.structured_response.escalation_reason,
                    next_actions: data.structured_response.next_actions || [],
                  }
                : undefined;

              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === streamingMessageId
                    ? {
                        ...msg,
                        content: finalContent,
                        isStreaming: false,
                        suggestions: [
                          'Tell me more about this',
                          'What are the next steps?',
                          'How do I implement this?',
                        ],
                        documents: uploadedDocuments.slice(0, 2).map((doc) => doc.title),
                        metadata: parsedMetadata,
                      }
                    : msg,
                ),
              );

              if (
                data.conversation_id &&
                (!currentConversationId || currentConversationId !== data.conversation_id)
              ) {
                setCurrentConversationId(data.conversation_id);
              }
              if (data.title && data.tags) {
                setCurrentConversation({
                  id: data.conversation_id,
                  title: data.title,
                  tags: data.tags,
                });
                if (messages.length === 0) {
                  toast({
                    title: 'Conversation titled',
                    description: `"${data.title}" - Topic automatically detected`,
                    className: 'message-success',
                  });
                }
              }

              if (data.escalate_recommendation) {
                setShowContextualEscalation(true);
                setEscalationRationale(
                  data.escalation_reason || 'AI recommends expert consultation for this query',
                );
                toast({
                  title: 'Expert consultation recommended',
                  description:
                    data.escalation_reason || 'This query may benefit from human expert guidance',
                  className: 'message-success',
                });
              }

              if (!isDemo) loadConversations();

              if (messages.length % 12 === 0 && messages.length > 12) {
                try {
                  await callFn('generate-summary', {
                    body: JSON.stringify({
                      conversationId: currentConversationId,
                      messages: messages.slice(-24),
                    }),
                  });
                } catch (summaryError: any) {
                  console.log('[EVENT] summary_failed', { error: summaryError?.message });
                }
              }

              setLoading(false);
              setAbortController(null);
              return;
            } else if (data.type === 'error') {
              throw new Error(data.error);
            }
          } catch (e) {
            // tolerate occasional non-JSON
          }
        }
      }

      if (streamedContent.trim() === '') {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === streamingMessageId
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
      setTimeout(() => scrollToBottom(), 100);
    } catch (error: any) {
      clearTimeout(typingTimeout);
      if (firstChunkTimeout) {
        clearTimeout(firstChunkTimeout);
        setFirstChunkTimeout(null);
      }
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

      const shouldOfferRetry =
        (error?.message?.includes('timeout') ||
          error?.message?.includes('network') ||
          error?.message?.includes('500') ||
          error?.message?.includes('503')) &&
        retryCount < 2;

      if (error?.name === 'AbortError') {
        toast({ title: 'Generation stopped', description: 'Response generation was cancelled.' });
      } else {
        toast({
          title: 'Connection Issue',
          description:
            retryCount > 0
              ? 'Still having issues. Try rephrasing.'
              : 'Failed to get response. Please try again.',
          variant: 'destructive',
          action: shouldOfferRetry ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRetryCount((prev) => prev + 1);
                setInput(inputMessage);
                handleSendMessage();
              }}
            >
              Retry
            </Button>
          ) : undefined,
        });
      }
      setInput(inputMessage);
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ✅ Title update via Edge Function (keeps UI)
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

  // === Policy generation pieces (unchanged UI) ===
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
        className: 'message-success',
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

  // Filters
  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch =
      searchTerm === '' ||
      conv.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (conv.tags || []).some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesTag = selectedTag === 'all' || (conv.tags || []).includes(selectedTag);
    return matchesSearch && matchesTag;
  });
  const allTags = [...new Set(conversations.flatMap((conv) => conv.tags || []))];

  // === Chat History Panel (unchanged UI, backed by chat-api) ===
  if (showChatHistory) {
    return (
      <div className={`mx-auto max-w-4xl ${className}`}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Chat History
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button onClick={startNewConversation} size="sm">
                  New Chat
                </Button>
                <Button variant="outline" onClick={() => setShowChatHistory(false)} size="sm">
                  Back to Chat
                </Button>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tags</SelectItem>
                  {allTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {filteredConversations.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <History className="mx-auto mb-4 h-12 w-12 opacity-50" />
                    <p>No conversations found</p>
                    <Button onClick={startNewConversation} className="mt-4">
                      Start your first conversation
                    </Button>
                  </div>
                ) : (
                  filteredConversations.map((conv) => (
                    <Card
                      key={conv.id}
                      className="cursor-pointer transition-colors hover:bg-muted/50"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1" onClick={() => loadConversation(conv.id)}>
                            <h3 className="truncate font-medium">{conv.title}</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {new Date(conv.updated_at).toLocaleDateString()} at{' '}
                              {new Date(conv.updated_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                            {(conv.tags || []).length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {(conv.tags || []).map((tag) => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteConversation(conv.id);
                            }}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    );
  }

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

  // Empty-state hero (unchanged UI)
  if (messages.length === 0) {
    return (
      <div className={`page flex h-full flex-col ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <main className="app-content flex flex-1 items-center justify-center px-4 py-8">
          <div
            className={`w-full max-w-2xl text-center transition-all duration-300 ${sidebarCollapsed ? 'ml-0' : 'ml-0'}`}
          >
            <div className="relative mb-12">
              <div className="absolute left-1/2 top-1/2 -z-10 h-32 w-32 -translate-x-1/2 -translate-y-1/2 transform rounded-full bg-gradient-to-br from-blue-500/50 to-cyan-400/50 blur-xl"></div>
              <div className="animate-pulse-scale relative z-10 mx-auto h-16 w-16">
                <img
                  src="/lovable-uploads/96610ed2-0036-4aab-bad3-a8a1b238393c.png"
                  alt="SentriQ Logo"
                  className="h-full w-full object-contain"
                  style={{ filter: 'drop-shadow(0 8px 20px rgba(59, 130, 246, 0.5))' }}
                />
              </div>
            </div>

            <h1 className="mb-4 text-3xl font-semibold text-foreground sm:text-4xl">
              {timeOfDay}, {userFirstName}
            </h1>
            <p className="mb-12 text-xl text-muted-foreground sm:text-2xl">
              How can I help you today?
            </p>

            <div className="w-full space-y-4">
              <div className="mx-auto grid max-w-4xl grid-cols-1 gap-3 md:grid-cols-2">
                {suggestedPrompts.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setInput(prompt);
                      setMessageToSend(prompt);
                    }}
                    className="group rounded-xl border border-border bg-card p-4 text-left transition-all duration-200 hover:bg-muted/50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="pr-2 text-sm text-foreground">{prompt}</span>
                      <ArrowUp className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </main>

        {!isDemo && user && showDocumentUpload && (
          <div className="space-y-3 px-4 pb-4">
            <Card className="mx-auto max-w-4xl border-dashed">
              <CardContent className="p-3 sm:p-4">
                <DocumentUpload onDocumentUploaded={handleDocumentUploaded} />
              </CardContent>
            </Card>
            <div className="mx-auto max-w-4xl">
              <InlineUpgradeNudge feature="document_upload" />
            </div>
          </div>
        )}

        <div
          className={`chat-composer transition-all duration-300 ${sidebarCollapsed ? 'ml-0' : 'ml-0'}`}
        >
          <div className="composer-shell" ref={composerRef}>
            <div className="inner">
              <SensitiveDataDetector
                content={input}
                onContentMasked={(masked) => setMessageToSend(masked)}
              />
              <MessageInputBox
                input={input}
                loading={loading}
                isDemo={isDemo}
                user={user}
                conversations={conversations}
                uploadedDocuments={uploadedDocuments}
                messages={messages}
                onInputChange={setInput}
                onSendMessage={handleSendMessage}
                onKeyPress={handleKeyPress}
                onShowChatHistory={() => setShowChatHistory(true)}
                onShowDocumentUpload={() => setShowDocumentUpload(!showDocumentUpload)}
                onDocumentUploaded={handleDocumentUploaded}
                inputRef={inputRef}
                abortController={abortController}
                onStopGeneration={handleStopGeneration}
              />
            </div>
          </div>
        </div>

        {isDemo && (
          <div className="bg-muted/20 p-3 text-center sm:p-4">
            <p className="px-4 text-sm text-muted-foreground">
              This is a demo.{' '}
              <a href="/auth" className="font-medium text-accent hover:underline">
                Get your virtual CISO
              </a>{' '}
              for full strategic guidance and compliance expertise.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Main chat UI (unchanged visuals)
  return (
    <div className={`page flex h-full flex-col ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="sticky top-0 z-40 flex-shrink-0 border-b border-border/50 bg-background/95 p-2 backdrop-blur-sm sm:p-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex min-w-0 flex-1 items-center space-x-3">
            <div className="hidden sm:block">
              <AiAvatar />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-sm font-semibold text-foreground sm:text-base">
                  Virtual CISO
                </h2>
                {currentConversation && (
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">•</span>
                    {editingTitle ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={editTitleValue}
                          onChange={(e) => setEditTitleValue(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && saveTitle()}
                          className="h-6 w-32 min-w-0 text-xs"
                          placeholder="Title..."
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={saveTitle}
                          className="h-6 w-6 p-0"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={cancelEditingTitle}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="group flex items-center gap-1">
                        <span className="max-w-32 truncate text-xs text-muted-foreground">
                          {currentConversation.title}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={startEditingTitle}
                          className="h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="truncate text-xs text-muted-foreground sm:text-sm">
                {isDemo ? 'Demo Mode' : 'Ready to provide strategic guidance'}
              </p>
            </div>
          </div>

          {!isDemo && user && (
            <div className="flex flex-shrink-0 items-center space-x-1 sm:space-x-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Talk to a Cybersecurity Expert"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <UserCheck className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
                  <EscalationIntakeForm
                    messages={messages}
                    onSubmit={() => {}}
                    onCancel={() => {}}
                  />
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </div>

      <main
        className="app-content flex-1 overflow-y-auto"
        ref={messagesContainerRef}
        onScroll={handleScroll}
      >
        <div className="mx-auto min-h-full max-w-4xl space-y-4 p-3 sm:space-y-6 sm:p-4">
          {!isDemo && user && uploadedDocuments.length > 0 && (
            <ContextManager
              documents={uploadedDocuments}
              activeDocuments={activeDocuments}
              onDocumentToggle={(docId) => {
                setActiveDocuments((prev) =>
                  prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId],
                );
              }}
              onClearContext={() => setActiveDocuments([])}
              className="mb-4"
            />
          )}

          {messages.map((message, index) => (
            <ChatMessage
              key={message.id || index}
              message={message}
              conversationId={currentConversation?.id}
              isLatest={index === messages.length - 1}
              isDemo={isDemo}
              user={user}
              messages={messages}
              onCopyMessage={copyMessage}
              onMessageReaction={handleMessageReaction}
              onSuggestionClick={handleSuggestionClick}
            />
          ))}

          {policyGenerationState.isActive && (
            <div className="my-6">
              <PolicyGenerationInterface
                policyType={policyGenerationState.policyType || ''}
                policyTitle={
                  policyGenerationState.policyType
                    ? POLICY_TEMPLATES[policyGenerationState.policyType].title
                    : ''
                }
                missingFields={policyGenerationState.missingFields}
                completionPercentage={Math.round(
                  ((10 - policyGenerationState.missingFields.length) / 10) * 100,
                )}
                onFieldsSubmit={handlePolicyFieldsSubmit}
                onUseDefaults={handlePolicyUseDefaults}
                isGenerating={policyGenerationState.isGenerating}
                generatedPolicy={policyGenerationState.generatedPolicy}
                templateUsed={policyGenerationState.policyType || undefined}
                messageId={
                  policyGenerationState.generatedPolicy
                    ? messages.find((m) => m.content === policyGenerationState.generatedPolicy)?.id
                    : undefined
                }
              />
            </div>
          )}

          {!isDemo && user && showContextualEscalation && escalationRationale && (
            <ContextualEscalationCard
              messages={messages}
              rationale={escalationRationale}
              onClose={() => {
                setShowContextualEscalation(false);
                setEscalationRationale(null);
              }}
            />
          )}

          {!isDemo && user && (
            <SmartEscalationTriggers
              messages={messages}
              uploadedDocuments={uploadedDocuments}
              conversationContext={conversationContext}
              sessionStart={sessionStart}
              onDismiss={() => {}}
            />
          )}

          <div ref={messagesEndRef} />
        </div>

        {showNewMessageIndicator && (
          <div className="absolute bottom-20 left-1/2 z-10 -translate-x-1/2 transform sm:bottom-24">
            <Button
              onClick={scrollToBottomAndMarkRead}
              size="sm"
              className="touch-manipulation rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground shadow-lg transition-all duration-200 hover:shadow-xl"
            >
              <ArrowUp className="mr-2 h-4 w-4" />
              New messages
            </Button>
          </div>
        )}

        {!isDemo && user && showDocumentUpload && (
          <div className="z-35 fixed bottom-20 left-0 right-0 md:left-64 lg:left-64">
            <div className="mx-auto max-w-4xl p-3 sm:p-4">
              <Card className="border-dashed border-accent/50 bg-background/95 shadow-lg backdrop-blur-sm">
                <CardContent className="p-3 sm:p-4">
                  <DocumentUpload onDocumentUploaded={handleDocumentUploaded} />
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>

      <div className="chat-composer">
        <div className="composer-shell" ref={composerRef}>
          <div className="inner">
            <SensitiveDataDetector
              content={input}
              onContentMasked={(masked) => setMessageToSend(masked)}
            />
            <MessageInputBox
              input={input}
              loading={loading}
              isDemo={isDemo}
              user={user}
              conversations={conversations}
              uploadedDocuments={uploadedDocuments}
              messages={messages}
              onInputChange={setInput}
              onSendMessage={handleSendMessage}
              onKeyPress={handleKeyPress}
              onShowChatHistory={() => setShowChatHistory(true)}
              onShowDocumentUpload={() => setShowDocumentUpload(!showDocumentUpload)}
              onDocumentUploaded={handleDocumentUploaded}
              inputRef={inputRef}
              abortController={abortController}
              onStopGeneration={handleStopGeneration}
            />
          </div>
        </div>
      </div>

      {!isDemo && user && messages.length > 2 && (
        <PersistentEscalationCTA messages={messages} position="floating" />
      )}
    </div>
  );
};

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Send,
  Bot,
  User,
  AlertCircle,
  ArrowUp,
  FileText,
  History,
  Plus,
  Search,
  Tag,
  X,
  Copy,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Edit3,
  MoreVertical,
  Check,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Textarea } from '@/components/ui/textarea';
import { DocumentUpload } from './DocumentUpload';
import { EscalationButton } from './EscalationButton';
import { EscalationIntakeForm } from './EscalationIntakeForm';
import { ChatMessage } from './ChatMessage';
import { MessageInputBox } from './MessageInputBox';
import { ContextManager } from './ContextManager';
import { SensitiveDataDetector } from './SensitiveDataDetector';
import { SmartEscalationTriggers } from './SmartEscalationTriggers';
import { PersistentEscalationCTA } from './PersistentEscalationCTA';
import { InlineUpgradeNudge } from '@/components/ui/feature-gate';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip } from '@/components/ui/custom-tooltip';
import { AiAvatar } from '@/components/ui/ai-avatar';
import { TypingIndicator, AnimatedMessage } from '@/components/ui/feedback';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ContextualEscalationCard, useEscalationTrigger } from './ContextualEscalationCard';
import { PolicyGenerationInterface } from './PolicyGenerationInterface';
import { useSidebar } from '@/components/ui/sidebar';
import {
  detectPolicyIntent,
  loadPolicyTemplate,
  analyzePolicyRequirements,
  processUserAnswers,
  generatePolicy,
  getPolicyTypeFromInput,
  POLICY_TEMPLATES,
  type PolicyType,
} from '@/lib/policyGenerator';
import { bindComposerHeight } from '@/lib/composer-sizing';
import { useChatSecurity } from '@/hooks/useChatSecurity';
import { useRealTimeChat } from '@/hooks/useRealTimeChat';
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
  const [showEscalation, setShowEscalation] = useState(false);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);
  const [activeDocuments, setActiveDocuments] = useState<string[]>([]);
  const [isEscalated, setIsEscalated] = useState(false);
  const [escalationInfo, setEscalationInfo] = useState<any>(null);
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
  }>({
    documentCount: 0,
    messageCount: 0,
  });
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

  // Policy generation state
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

  // Bind composer height for proper spacing using the composer shell element
  useEffect(() => {
    if (composerRef.current) {
      const cleanup = bindComposerHeight(composerRef.current);
      return cleanup;
    }
  }, []);

  // Listen for new chat URL parameter
  useEffect(() => {
    const newParam = searchParams.get('new');
    if (newParam === 'true') {
      // Reset chat state
      setMessages([]);
      setInput('');
      setCurrentConversation(null);
      setActiveDocuments([]);
      setShowChatHistory(false);
      setShowDocumentUpload(false);
      // Clear the URL parameter
      searchParams.delete('new');
      setSearchParams(searchParams, {
        replace: true,
      });
    }
  }, [searchParams, setSearchParams]);

  // Check for contextual escalation triggers after each assistant message
  useEffect(() => {
    const escalationTrigger = useEscalationTrigger(messages, lastAssistantReplyCount);
    if (escalationTrigger.shouldShow) {
      setShowContextualEscalation(true);
      setEscalationRationale(escalationTrigger.rationale);
      setLastAssistantReplyCount(messages.filter((m) => m.role === 'assistant').length);
    }
  }, [messages, lastAssistantReplyCount]);
  // Smart scrolling - only auto-scroll if user is near bottom
  useEffect(() => {
    if (isNearBottom) {
      scrollToBottom();
      setShowNewMessageIndicator(false);
    } else if (messages.length > 0) {
      setShowNewMessageIndicator(true);
    }
  }, [messages, isNearBottom]);
  useEffect(() => {
    // Load user's uploaded documents and conversations on component mount
    if (user && !isDemo) {
      loadUserDocuments();
      loadConversations();

      // Check if we should load a specific conversation from URL params
      const conversationId = searchParams.get('conversation');
      if (conversationId) {
        loadConversation(conversationId);
        // Clear the URL parameter after loading
        setSearchParams({});
      }
    }
  }, [user, isDemo, searchParams]);
  const loadUserDocuments = async () => {
    try {
      const { data, error } = await supabase.from('documents').select('*').order('uploaded_at', {
        ascending: false,
      });
      if (error) {
        console.error('Error loading documents:', error);
      } else {
        setUploadedDocuments(data || []);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };
  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .order('updated_at', {
          ascending: false,
        });
      if (error) {
        console.error('Error loading conversations:', error);
      } else {
        setConversations(data || []);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };
  const saveConversation = async (messages: Message[]) => {
    if (!user || isDemo || messages.length === 0) return;
    try {
      const title =
        messages[0]?.content.slice(0, 50) + (messages[0]?.content.length > 50 ? '...' : '');
      let conversationId = currentConversationId;
      if (!conversationId) {
        // Create new conversation
        const { data: conversation, error: convError } = await supabase
          .from('chat_conversations')
          .insert({
            user_id: user.id,
            title,
            tags: [],
          })
          .select()
          .single();
        if (convError) throw convError;
        conversationId = conversation.id;
        setCurrentConversationId(conversationId);
      }

      // Save messages
      const messagesToSave = messages.map((msg) => ({
        conversation_id: conversationId,
        role: msg.role,
        content: msg.content,
        timestamp: new Date().toISOString(),
      }));

      // Delete existing messages for this conversation and insert new ones
      await supabase.from('chat_messages').delete().eq('conversation_id', conversationId);
      const { error: msgError } = await supabase.from('chat_messages').insert(messagesToSave);
      if (msgError) throw msgError;

      // Update conversation timestamp
      await supabase
        .from('chat_conversations')
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      // Reload conversations to update the list
      loadConversations();
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  };
  const loadConversation = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('timestamp');
      if (error) throw error;
      const loadedMessages = data.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
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
  const deleteConversation = async (conversationId: string) => {
    try {
      const { error } = await supabase.from('chat_conversations').delete().eq('id', conversationId);
      if (error) throw error;

      // If we're deleting the current conversation, start a new one
      if (conversationId === currentConversationId) {
        startNewConversation();
      }
      loadConversations();
      toast({
        title: 'Conversation deleted',
        description: 'The conversation has been removed.',
      });
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
    setConversationContext((prev) => ({
      ...prev,
      documentCount: prev.documentCount + 1,
    }));
    toast({
      title: 'Document uploaded',
      description: 'Your document is now available for AI analysis in future conversations.',
      className: 'message-success',
    });
  };
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  };

  // Handle scroll detection for smart auto-scrolling
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 40; // 40px threshold for better UX

    setIsNearBottom(isAtBottom);
    if (isAtBottom) {
      setShowNewMessageIndicator(false);
    }
  };
  const scrollToBottomAndMarkRead = () => {
    scrollToBottom();
    setShowNewMessageIndicator(false);
    setIsNearBottom(true);
  };

  // Handle escalation
  const handleEscalation = (escalationData: any) => {
    setIsEscalated(true);
    setEscalationInfo(escalationData);

    // Add system message to indicate escalation
    const systemMessage: Message = {
      role: 'assistant',
      content: `You have been connected to a cybersecurity expert. ${escalationData.message || 'A human expert will respond to your questions.'}`,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      metadata: {
        escalated: true,
        ai_triggered: false,
        estimated_wait_time: escalationData.estimatedWaitTime,
      },
    };

    setMessages((prev) => [...prev, systemMessage]);
    scrollToBottom();
  };

  // Handle sending messages to consultant after escalation
  const handleMessageToConsultant = async (messageContent: string) => {
    const userMessage: Message = {
      role: 'user',
      content: messageContent,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Send message to backend for consultant routing
      const response = await fetch(
        'https://xfdqnmtzuuphxivsgmua.supabase.co/functions/v1/chat-api',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversationId: currentConversationId,
            message: messageContent,
            role: 'user',
            isEscalated: true,
          }),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to send message to consultant');
      }

      // Message is sent - consultant will respond through real-time updates
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

  // Polling for new messages when escalated
  useEffect(() => {
    if (!isEscalated || !currentConversationId) return;

    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('conversation_id', currentConversationId)
          .order('timestamp', { ascending: false })
          .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
          const latestMessage = data[0];
          const lastMessage = messages[messages.length - 1];

          // Check if this is a new message from consultant
          if (
            latestMessage.role === 'consultant' &&
            (!lastMessage || lastMessage.id !== latestMessage.id)
          ) {
            const newMessage: Message = {
              role: 'assistant', // Display consultant messages as assistant
              content: latestMessage.content,
              timestamp: new Date(latestMessage.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              }),
              id: latestMessage.id,
              metadata: {
                escalated: true,
                consultant_reply: true,
              },
            };

            setMessages((prev) => {
              // Avoid duplicates
              if (prev.some((msg) => msg.id === newMessage.id)) return prev;
              return [...prev, newMessage];
            });
          }
        }
      } catch (error) {
        console.error('Error polling for consultant messages:', error);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [isEscalated, currentConversationId, messages]);
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);
  const handleSendMessage = async () => {
    if (!input.trim() || loading) return; // Concurrency guard

    // Security checks
    if (!checkAuthentication()) {
      // Redirect to auth page
      window.location.href = '/auth';
      return;
    }

    if (!(await validateSession())) {
      return;
    }

    const inputMessage = messageToSend || input;

    // Enhanced input validation
    if (!inputMessage || inputMessage.trim().length < 2) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter a meaningful question or request (at least 2 characters).',
        variant: 'destructive',
      });
      return;
    }

    // Check for gibberish or very short inputs
    if (inputMessage.trim().length < 3 && !/^(hi|ok|yes|no)$/i.test(inputMessage.trim())) {
      toast({
        title: 'Please Clarify',
        description: 'Could you provide a more detailed question?',
        variant: 'destructive',
      });
      return;
    }

    // Validate and sanitize input
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

    // Validate prompt before processing
    if (!sanitizedMessage || sanitizedMessage.trim().length < 3) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter a meaningful question or request.',
        variant: 'destructive',
      });
      return;
    }

    setRetryCount(0); // Reset retry count on new message

    // Check for policy generation intent before sending to AI
    const policyIntent = detectPolicyIntent(sanitizedMessage);
    if (policyIntent !== 'none') {
      await handlePolicyGenerationFlow(policyIntent, sanitizedMessage);
      return;
    }

    // If conversation is escalated, don't process through AI
    if (isEscalated) {
      await handleMessageToConsultant(sanitizedMessage);
      return;
    }

    // Instrument event
    console.log('[EVENT] message_submitted', {
      length: inputMessage.length,
      conversationId: currentConversationId,
    });
    const userMessage: Message = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    console.log('[DEBUG] Added user message, total messages:', newMessages.length);

    // Create streaming message placeholder with typing indicator
    const streamingMessageId = `streaming_${Date.now()}`;
    const streamingMessage: Message = {
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      id: streamingMessageId,
      isStreaming: true,
    };
    setMessages((prev) => {
      const withStreaming = [...prev, streamingMessage];
      console.log('[DEBUG] Added streaming message, total messages:', withStreaming.length);
      return withStreaming;
    });
    setInput('');
    setLoading(true);
    setConversationContext((prev) => ({
      ...prev,
      messageCount: prev.messageCount + 1,
    }));

    // Set timeout for typing indicator (30 seconds)
    const responseTimeout = setTimeout(() => {
      if (loading) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === streamingMessageId
              ? {
                  ...msg,
                  content: "Sorry, I'm taking longer than usual to respond. Please try again.",
                }
              : msg,
          ),
        );
        setLoading(false);
        toast({
          title: 'Response Timeout',
          description: 'The response is taking longer than expected. Please try again.',
          variant: 'destructive',
        });
      }
    }, 30000);

    // Create abort controller for this request
    const controller = new AbortController();
    setAbortController(controller);

    // Show typing indicator after 150ms if no response yet
    const typingTimeout = setTimeout(() => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === streamingMessageId
            ? {
                ...msg,
                content: '',
              } // Keep empty to trigger thinking state
            : msg,
        ),
      );
    }, 150);

    // Set timeout for first chunk (10 seconds)
    let timeoutCleared = false;
    const chunkTimeout = setTimeout(() => {
      if (!timeoutCleared && !controller.signal.aborted) {
        console.log('[EVENT] response_timeout_triggered', {
          timestamp: Date.now(),
        });
        controller.abort();
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
    console.log('[EVENT] llm_started', {
      timestamp: Date.now(),
    });
    let firstChunkReceived = false;
    try {
      // Make streaming request with abort signal
      console.log('[DEBUG] Sending request to chat-with-ai:', {
        message: inputMessage,
        conversationId: currentConversationId,
        userId: user?.id,
        activeDocuments,
      });

      const response = await fetch(
        'https://xfdqnmtzuuphxivsgmua.functions.supabase.co/functions/v1/chat-with-ai',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json',
            apikey:
              'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmZHFubXR6dXVwaHhpdnNnbXVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5MjE2MDksImV4cCI6MjA2OTQ5NzYwOX0.op82w015Am91OghHdNauFrQbajQzeu4E0VKY_mqt5M0',
          },
          body: JSON.stringify({
            message: inputMessage,
            conversationId: currentConversationId,
            userId: user?.id,
            activeDocuments: activeDocuments.length > 0 ? activeDocuments : undefined,
            conversation: messages.slice(-8), // Pass last 8 messages for context
          }),
          signal: controller.signal,
        },
      );

      console.log('[DEBUG] Response received:', response.status, response.statusText);
      if (!response.ok) {
        console.log('[ERROR] HTTP Response not OK:', response.status, response.statusText);
        const errorText = await response.text();
        console.log('[ERROR] Response body:', errorText);

        // Try to parse error response for structured errors
        let parsedError;
        try {
          parsedError = JSON.parse(errorText);
        } catch {
          parsedError = { error: errorText };
        }

        // Handle specific error types
        if (response.status >= 500 || response.status === 429) {
          // Server errors or rate limiting - show retry option
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === streamingMessageId
                ? {
                    ...msg,
                    content: `I'm experiencing high demand right now. ${parsedError.retry_recommended ? 'Please try your question again in a moment.' : 'Please try again later.'}`,
                    isStreaming: false,
                  }
                : msg,
            ),
          );
          toast({
            title: 'Service Busy',
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
        } else {
          // Client errors - show more specific message
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === streamingMessageId
                ? {
                    ...msg,
                    content: `I couldn't process that request. ${parsedError.error?.includes('invalid') ? 'Could you rephrase your question?' : 'Please try again or contact support if this continues.'}`,
                    isStreaming: false,
                  }
                : msg,
            ),
          );
        }

        setLoading(false);
        return;
      }
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }
      let streamedContent = '';
      const decoder = new TextDecoder();
      let buffer = '';

      // Auto-scroll function with user scroll detection
      const autoScrollIfAtBottom = () => {
        if (isNearBottom && messagesContainerRef.current) {
          setTimeout(() => scrollToBottom(), 50);
        }
      };
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('[DEBUG] Stream ended');
          break;
        }
        const chunk = decoder.decode(value);
        console.log('[DEBUG] Raw chunk received:', chunk);
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          console.log('[DEBUG] Processing line:', line);
          if (line.startsWith('data: ') && line.trim() !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'chunk') {
                clearTimeout(typingTimeout); // Clear typing timeout on first chunk

                if (!firstChunkReceived) {
                  firstChunkReceived = true;
                  timeoutCleared = true;
                  if (firstChunkTimeout) {
                    clearTimeout(firstChunkTimeout);
                    setFirstChunkTimeout(null);
                  }
                  console.log('[EVENT] first_token_received', {
                    timestamp: Date.now(),
                  });
                }
                streamedContent += data.content;
                console.log('[DEBUG] Streaming chunk received', {
                  content: data.content,
                  totalLength: streamedContent.length,
                });

                // Update the streaming message
                setMessages((prev) => {
                  const updated = prev.map((msg) =>
                    msg.id === streamingMessageId
                      ? {
                          ...msg,
                          content: streamedContent,
                        }
                      : msg,
                  );
                  console.log(
                    '[DEBUG] Messages updated, streaming content length:',
                    streamedContent.length,
                  );
                  return updated;
                });
                if (data.conversation_id) {
                  setCurrentConversationId(data.conversation_id);
                }

                // Auto-scroll while streaming if user is at bottom
                autoScrollIfAtBottom();
              } else if (data.type === 'escalated') {
                // Handle escalated conversation responses
                clearTimeout(typingTimeout);
                setLoading(false);
                setAbortController(null);

                // Finalize the streaming message with escalation notice
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

                // Show escalation notification
                toast({
                  title: data.ai_triggered ? 'Escalated to Expert' : 'Connected to Expert',
                  description: data.estimated_wait_time
                    ? `Estimated response time: ${data.estimated_wait_time}`
                    : 'An expert will respond shortly',
                  className: 'message-success',
                });

                console.log('[EVENT] conversation_escalated', {
                  ai_triggered: data.ai_triggered,
                  conversation_id: data.conversation_id,
                });

                // Reload conversations to update status
                if (!isDemo) {
                  loadConversations();
                }

                return; // Exit streaming loop
              } else if (data.type === 'complete') {
                // Use the streamed content as final content
                const finalContent = streamedContent;

                // Extract metadata from structured response
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

                // Finalize the message
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
                          metadata:
                            parsedMetadata ||
                            (data.structured_response
                              ? {
                                  risk_level: data.structured_response.risk_level,
                                  framework_tags: data.structured_response.framework_tags,
                                  confidence: data.structured_response.confidence,
                                  escalate_recommendation: data.escalate_recommendation,
                                  escalation_reason: data.escalation_reason,
                                  next_actions: data.structured_response.next_actions,
                                }
                              : undefined),
                        }
                      : msg,
                  ),
                );

                // Update conversation state with new title and tags if generated
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

                  // Show toast notification for generated title
                  if (messages.length === 0) {
                    toast({
                      title: 'Conversation titled',
                      description: `"${data.title}" - Topic automatically detected`,
                      className: 'message-success',
                    });
                  }
                }

                // Handle escalation recommendation
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
                  console.log('[EVENT] escalation_suggested', {
                    reason: data.escalation_reason,
                  });
                }

                // Reload conversations to update the list
                if (!isDemo) {
                  loadConversations();
                }

                // Auto-generate summary every 6 turns (12 messages)
                if (messages.length % 12 === 0 && messages.length > 12) {
                  try {
                    await supabase.functions.invoke('generate-summary', {
                      body: {
                        conversationId: currentConversationId,
                        messages: messages.slice(-24), // Last 12 pairs for context
                      },
                    });
                    console.log('[EVENT] summary_generated', {
                      conversationId: currentConversationId,
                    });
                  } catch (summaryError) {
                    console.log('[EVENT] summary_failed', {
                      error: summaryError.message,
                    });
                  }
                }

                // Analytics
                console.log('[EVENT] llm_succeeded', {
                  timestamp: Date.now(),
                  tokens: streamedContent.length,
                  structured: !!data.structured_response,
                  escalateRecommendation: data.escalate_recommendation,
                });

                // Clear loading state when completed
                setLoading(false);
                setAbortController(null);

                // Exit the stream processing loop completely
                return; // This will exit the entire streaming function
              } else if (data.type === 'error') {
                throw new Error(data.error);
              }
            } catch (parseError) {
              console.error('Error parsing streaming data:', parseError);
            }
          }
        }
      }

      // Check if we completed streaming but got no content - provide fallback
      if (streamedContent.trim() === '') {
        console.log('[DEBUG] Empty response received, providing fallback');
        const fallbackMessage: Message = {
          role: 'assistant',
          content:
            'Could you clarify your question or provide more detail? I want to make sure I give you the most helpful response.',
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          id: streamingMessageId,
          isStreaming: false,
        };

        setMessages((prev) =>
          prev.map((msg) => (msg.id === streamingMessageId ? fallbackMessage : msg)),
        );
        setLoading(false);
        setAbortController(null);
        return;
      }
      setConversationContext((prev) => ({
        ...prev,
        messageCount: prev.messageCount + 1,
      }));

      // Ensure proper scrolling after message is complete
      setTimeout(() => scrollToBottom(), 100);
    } catch (error: any) {
      clearTimeout(typingTimeout);
      if (firstChunkTimeout) {
        clearTimeout(firstChunkTimeout);
        setFirstChunkTimeout(null);
      }
      setLoading(false);
      setAbortController(null);

      // Log detailed error information
      console.error('=== CHAT ERROR DETAILS ===');
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Input message:', inputMessage);
      console.error('Retry count:', retryCount);
      console.error('Conversation ID:', currentConversationId);

      // Determine appropriate response based on error type
      let fallbackContent: string;

      if (error.name === 'AbortError') {
        fallbackContent =
          'Response generation was cancelled. Please try asking your question again.';
      } else if (error.message?.includes('timeout') || error.message?.includes('network')) {
        fallbackContent =
          'Connection timeout. Please check your internet connection and try again.';
      } else if (error.message?.includes('500') || error.message?.includes('503')) {
        fallbackContent = 'Our service is temporarily busy. Please try again in a moment.';
      } else if (error.message?.includes('429')) {
        fallbackContent = 'Too many requests. Please wait a moment before trying again.';
      } else if (inputMessage.trim().length < 3) {
        fallbackContent = 'Could you please provide a more detailed question?';
      } else {
        fallbackContent =
          retryCount > 0
            ? "I'm still having trouble processing your request. Please try rephrasing your question or contact support."
            : 'I encountered an issue processing your request. Please try again or rephrase your question.';
      }

      const fallbackMessage: Message = {
        role: 'assistant',
        content: fallbackContent,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        id: streamingMessageId,
        isStreaming: false,
      };

      setMessages((prev) =>
        prev.map((msg) => (msg.id === streamingMessageId ? fallbackMessage : msg)),
      );

      // Only offer manual retry for certain error types - no automatic retry to avoid loops
      const shouldOfferRetry =
        (error.message?.includes('timeout') ||
          error.message?.includes('network') ||
          error.message?.includes('500') ||
          error.message?.includes('503')) &&
        retryCount < 2;

      // Show appropriate toast based on error type
      if (error.name === 'AbortError') {
        console.log('[EVENT] generation_stopped', {
          timestamp: Date.now(),
        });
        toast({
          title: 'Generation stopped',
          description: 'Response generation was cancelled.',
        });
      } else {
        console.log('[EVENT] llm_failed', {
          timestamp: Date.now(),
          error: error.message,
          retryCount,
          inputLength: inputMessage?.length || 0,
          errorType: error.name,
          offerRetry: shouldOfferRetry,
        });

        toast({
          title: 'Connection Issue',
          description:
            retryCount > 0
              ? 'Still having issues. Please try rephrasing your question.'
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
      setInput(inputMessage); // Restore input for manual retry
    }
  };

  // Retry function with exponential backoff
  const handleRetry = async (originalMessage: string, originalMessageId: string) => {
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

    // Wait before retry (exponential backoff)
    await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
    handleSendMessage();
  };

  // Stop generation function
  const handleStopGeneration = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
  };
  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: 'Copied',
      description: 'Message copied to clipboard',
    });
  };
  const handleMessageReaction = (messageId: string, reaction: 'up' | 'down') => {
    // Here you could save the reaction to your database
    toast({
      title: reaction === 'up' ? 'Feedback sent' : 'Feedback noted',
      description: `Thank you for your ${reaction === 'up' ? 'positive' : ''} feedback!`,
    });
  };
  const handleSuggestionClick = (suggestion: string) => {
    console.log('[EVENT] quick_reply_clicked', {
      suggestion,
    });
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
  const updateConversationTitle = async (newTitle: string, newTags: string[]) => {
    if (!currentConversationId || !newTitle.trim()) return;
    try {
      const { data, error } = await supabase.functions.invoke('update-chat-title', {
        body: {
          conversationId: currentConversationId,
          title: newTitle,
          tags: newTags,
        },
      });
      if (error) throw error;

      // Update local state
      setCurrentConversation((prev) =>
        prev
          ? {
              ...prev,
              title: newTitle,
              tags: newTags,
            }
          : null,
      );
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

  // v2.0 Policy generation flow handler
  const handlePolicyGenerationFlow = async (
    intent: 'unspecified' | 'specified',
    userMessage: string,
  ) => {
    // Add user message to chat first
    const userChatMessage: Message = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
    setMessages((prev) => [...prev, userChatMessage]);
    setInput('');
    if (intent === 'unspecified') {
      // Show policy type selection chips
      const policySelectionMessage: Message = {
        role: 'assistant',
        content: 'Sure — which policy do you need? Quick options:',
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
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
      // Intent is "specified" - extract policy type and start generation
      const policyInfo = getPolicyTypeFromInput(userMessage);
      if (policyInfo) {
        await initiatePolicyGeneration(policyInfo.type, userMessage, policyInfo.title);
      } else {
        // Fallback to asking for type if we couldn't detect it
        const fallbackMessage: Message = {
          role: 'assistant',
          content: 'I can help you create a policy! Which type would you like?',
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
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

  // Policy generation functions (enhanced for v2.0 with unknown policy support)
  const initiatePolicyGeneration = async (
    policyType: PolicyType,
    userMessage: string,
    customTitle?: string,
  ) => {
    try {
      console.log('[DEBUG] Starting policy generation for:', policyType);

      // Load the template
      const template = await loadPolicyTemplate(policyType);
      console.log('[DEBUG] Template loaded, length:', template.length);

      // Build context from user profile with custom title support
      const userProfile = user
        ? {
            business_name: user.user_metadata?.company_name || 'Your Organization',
            policy_title: customTitle || POLICY_TEMPLATES[policyType].title,
          }
        : {
            policy_title: customTitle || POLICY_TEMPLATES[policyType].title,
          };
      console.log('[DEBUG] User profile:', userProfile);

      // Analyze requirements (now excludes reserved tokens)
      const requirements = await analyzePolicyRequirements(template, userProfile);
      console.log('[DEBUG] Requirements analysis:', {
        missingFields: requirements.missingFields,
        totalFields: requirements.totalFields,
        completionPercentage: requirements.completionPercentage,
      });

      // Update policy generation state
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
      console.log('[DEBUG] Policy generation state updated, isActive:', true);

      // If no missing fields, generate immediately
      if (requirements.missingFields.length === 0) {
        console.log('[DEBUG] No missing fields, generating policy immediately');
        await generatePolicyDocument(template, userProfile, {});
      } else {
        console.log(
          '[DEBUG] Missing fields found, waiting for user input:',
          requirements.missingFields,
        );
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
    const updatedAnswers = {
      ...policyGenerationState.userAnswers,
      ...answers,
    };
    const userProfile = user
      ? {
          business_name: user.user_metadata?.company_name || 'Your Organization',
        }
      : {};
    setPolicyGenerationState((prev) => ({
      ...prev,
      userAnswers: updatedAnswers,
    }));

    // Check if we still have missing fields
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
      ? {
          business_name: user.user_metadata?.company_name || 'Your Organization',
        }
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
    console.log('[DEBUG] Generating policy document...');
    setPolicyGenerationState((prev) => ({
      ...prev,
      isGenerating: true,
    }));
    try {
      const result = generatePolicy(template, userProfile, answers);
      console.log('[DEBUG] Policy generated successfully, length:', result.policy.length);
      console.log('[DEBUG] Policy completion status:', {
        isComplete: result.isComplete,
        missingFields: result.missingFields,
      });

      // Add policy to chat as assistant message
      const policyMessage: Message = {
        role: 'assistant',
        content: result.policy,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        metadata: {
          risk_level: 'low',
          framework_tags: ['policy', 'governance'],
          confidence: 0.95,
        },
      };
      console.log('[DEBUG] Adding policy message to chat');
      setMessages((prev) => [...prev, policyMessage]);
      console.log('[DEBUG] Updating policy generation state with generated policy');
      setPolicyGenerationState((prev) => ({
        ...prev,
        generatedPolicy: result.policy,
        isGenerating: false,
        isActive: true, // Keep active to show the save button!
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
      setPolicyGenerationState((prev) => ({
        ...prev,
        isGenerating: false,
      }));
    }
  };

  // Filter conversations based on search and tag
  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch =
      searchTerm === '' ||
      conv.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesTag = selectedTag === 'all' || conv.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  // Get all unique tags
  const allTags = [...new Set(conversations.flatMap((conv) => conv.tags))];
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
                  <Plus className="mr-2 h-4 w-4" />
                  New Chat
                </Button>
                <Button variant="outline" onClick={() => setShowChatHistory(false)} size="sm">
                  Back to Chat
                </Button>
              </div>
            </div>

            {/* Search and filter */}
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
                            {conv.tags.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {conv.tags.map((tag) => (
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
  if (messages.length === 0) {
    return (
      <div className={`page flex h-full flex-col ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Main Content - Scrollable */}
        <main className="app-content flex flex-1 items-center justify-center px-4 py-8">
          <div
            className={`w-full max-w-2xl text-center transition-all duration-300 ${sidebarCollapsed ? 'ml-0' : 'ml-0'}`}
          >
            {/* Logo with pulsing animation and colored shadow */}
            <div className="relative mb-12">
              <div className="absolute left-1/2 top-1/2 -z-10 h-32 w-32 -translate-x-1/2 -translate-y-1/2 transform rounded-full bg-gradient-to-br from-blue-500/50 to-cyan-400/50 blur-xl"></div>
              <div className="animate-pulse-scale relative z-10 mx-auto h-16 w-16">
                <img
                  src="/lovable-uploads/96610ed2-0036-4aab-bad3-a8a1b238393c.png"
                  alt="SentriQ Logo"
                  className="h-full w-full object-contain"
                  style={{
                    filter: 'drop-shadow(0 8px 20px rgba(59, 130, 246, 0.5))',
                  }}
                />
              </div>
            </div>

            {/* Greeting */}
            <h1 className="mb-4 text-3xl font-semibold text-foreground sm:text-4xl">
              {timeOfDay}, {userFirstName}
            </h1>
            <p className="mb-12 text-xl text-muted-foreground sm:text-2xl">
              How can I help you today?
            </p>

            {/* Suggested prompts */}
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

        {/* Document Upload Section - Positioned above composer */}
        {!isDemo && user && showDocumentUpload && (
          <div className="space-y-3 px-4 pb-4">
            <Card className="mx-auto max-w-4xl border-dashed">
              <CardContent className="p-3 sm:p-4">
                <DocumentUpload onDocumentUploaded={handleDocumentUploaded} />
              </CardContent>
            </Card>
            {/* Inline upgrade nudge for document upload */}
            <div className="mx-auto max-w-4xl">
              <InlineUpgradeNudge feature="document_upload" />
            </div>
          </div>
        )}

        {/* Floating Composer */}
        <div
          className={`chat-composer transition-all duration-300 ${sidebarCollapsed ? 'ml-0' : 'ml-0'}`}
        >
          <div className="composer-shell" ref={composerRef}>
            <div className="inner">
              <SensitiveDataDetector
                content={input}
                onContentMasked={(maskedContent) => setMessageToSend(maskedContent)}
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

        {/* Demo text */}
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
  return (
    <div className={`page flex h-full flex-col ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Chat Header with Expert Button */}
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
              {/* Expert Button */}
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

      {/* Main Messages Container - Scrollable with proper spacing */}
      <main
        className="app-content flex-1 overflow-y-auto"
        ref={messagesContainerRef}
        onScroll={handleScroll}
      >
        <div className="mx-auto min-h-full max-w-4xl space-y-4 p-3 sm:space-y-6 sm:p-4">
          {/* Context Manager */}
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
              key={index}
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

          {/* Policy Generation Interface */}
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
                    ? messages.find((msg) => msg.content === policyGenerationState.generatedPolicy)
                        ?.id
                    : undefined
                }
              />
            </div>
          )}

          {/* Contextual Escalation Card */}
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

          {/* Smart Escalation Triggers */}
          {!isDemo && user && (
            <SmartEscalationTriggers
              messages={messages}
              uploadedDocuments={uploadedDocuments}
              conversationContext={conversationContext}
              sessionStart={sessionStart}
              onDismiss={(triggerId) => {
                console.log('Escalation trigger dismissed:', triggerId);
              }}
            />
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* New Message Indicator */}
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

        {/* Document Upload Section - Positioned above composer when visible */}
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

      {/* Floating Composer */}
      <div className="chat-composer">
        <div className="composer-shell" ref={composerRef}>
          <div className="inner">
            <SensitiveDataDetector
              content={input}
              onContentMasked={(maskedContent) => setMessageToSend(maskedContent)}
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

      {/* Floating Escalation CTA */}
      {!isDemo && user && messages.length > 2 && (
        <PersistentEscalationCTA messages={messages} position="floating" />
      )}
    </div>
  );
};

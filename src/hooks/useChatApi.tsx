import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  conversation_id: string;
  content: string;
  role: 'user' | 'assistant' | 'consultant' | 'system';
  timestamp: string;
  metadata?: Record<string, any>;
}

interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  org_id: string;
  tags?: string[];
  chat_messages?: { count: number }[];
}

interface UseChatApiReturn {
  // State
  conversations: Conversation[];
  messages: ChatMessage[];
  currentConversation: Conversation | null;
  loading: boolean;
  sending: boolean;
  error: string | null;

  // Actions
  loadConversations: () => Promise<void>;
  createConversation: (title: string, initialMessage?: string) => Promise<Conversation | null>;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string, role?: string) => Promise<ChatMessage | null>;
  setCurrentConversation: (conversation: Conversation | null) => void;
  clearError: () => void;
}

export const useChatApi = (): UseChatApiReturn => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const clearError = useCallback(() => setError(null), []);

  const handleError = useCallback((error: any, defaultMessage: string) => {
    console.error('Chat API Error:', error);
    const message = error.message || defaultMessage;
    setError(message);
    toast({
      title: "Error",
      description: message,
      variant: "destructive",
    });
  }, [toast]);

  // Load user's conversations
  const loadConversations = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`https://xfdqnmtzuuphxivsgmua.supabase.co/functions/v1/chat-api/conversations`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      setConversations(data.conversations || []);
    } catch (err: any) {
      handleError(err, 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Create new conversation
  const createConversation = useCallback(async (title: string, initialMessage?: string): Promise<Conversation | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`https://xfdqnmtzuuphxivsgmua.supabase.co/functions/v1/chat-api/conversations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          initialMessage
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const newConversation = data.conversation;
      setConversations(prev => [newConversation, ...prev]);
      
      toast({
        title: "Success",
        description: "Conversation created successfully",
      });

      return newConversation;
    } catch (err: any) {
      handleError(err, 'Failed to create conversation');
      return null;
    } finally {
      setLoading(false);
    }
  }, [handleError, toast]);

  // Load messages for a conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`https://xfdqnmtzuuphxivsgmua.supabase.co/functions/v1/chat-api/conversations/${conversationId}/messages`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      setMessages(data.messages || []);
    } catch (err: any) {
      handleError(err, 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Send a message
  const sendMessage = useCallback(async (conversationId: string, content: string, role?: string): Promise<ChatMessage | null> => {
    setSending(true);
    setError(null);
    
    try {
      const response = await fetch(`https://xfdqnmtzuuphxivsgmua.supabase.co/functions/v1/chat-api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          role
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const newMessage = data.message;
      setMessages(prev => [...prev, newMessage]);
      
      // Update conversation timestamp in local state
      setConversations(prev => prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, updated_at: new Date().toISOString() }
          : conv
      ));

      return newMessage;
    } catch (err: any) {
      handleError(err, 'Failed to send message');
      return null;
    } finally {
      setSending(false);
    }
  }, [handleError]);

  // Set up real-time message subscription
  useEffect(() => {
    if (!currentConversation) return;

    console.log('Setting up real-time subscription for conversation:', currentConversation.id);

    const channel = supabase
      .channel(`conversation_${currentConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${currentConversation.id}`
        },
        (payload) => {
          console.log('New message received:', payload.new);
          const newMessage = payload.new as ChatMessage;
          
          // Only add if it's not already in our messages (avoid duplicates)
          setMessages(prev => {
            const exists = prev.some(msg => msg.id === newMessage.id);
            if (exists) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [currentConversation]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return {
    // State
    conversations,
    messages,
    currentConversation,
    loading,
    sending,
    error,

    // Actions
    loadConversations,
    createConversation,
    loadMessages,
    sendMessage,
    setCurrentConversation,
    clearError,
  };
};
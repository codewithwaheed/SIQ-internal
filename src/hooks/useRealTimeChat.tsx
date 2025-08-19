import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  conversation_id: string;
  content: string;
  role: 'user' | 'assistant' | 'consultant' | 'system';
  timestamp: string;
  metadata?: Record<string, any>;
}

interface UseRealTimeChatReturn {
  messages: ChatMessage[];
  isConnected: boolean;
  connectionError: string | null;
  subscribeToConversation: (conversationId: string) => void;
  unsubscribeFromConversation: () => void;
  addLocalMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
}

export const useRealTimeChat = (): UseRealTimeChatReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const channelRef = useRef<any>(null);
  const currentConversationRef = useRef<string | null>(null);

  const subscribeToConversation = useCallback(
    (conversationId: string) => {
      if (!user || currentConversationRef.current === conversationId) return;

      // Unsubscribe from previous conversation
      unsubscribeFromConversation();

      console.log('Subscribing to real-time updates for conversation:', conversationId);
      currentConversationRef.current = conversationId;

      try {
        const channel = supabase
          .channel(`conversation_${conversationId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'chat_messages',
              filter: `conversation_id=eq.${conversationId}`,
            },
            (payload) => {
              console.log('New message received via real-time:', payload.new);
              const newMessage = payload.new as ChatMessage;

              // Only add if from consultant/system (user messages are added optimistically)
              if (newMessage.role === 'consultant' || newMessage.role === 'system') {
                setMessages((prev) => {
                  // Avoid duplicates
                  const exists = prev.some((msg) => msg.id === newMessage.id);
                  if (exists) return prev;

                  return [...prev, newMessage].sort(
                    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
                  );
                });

                // Show notification for consultant replies
                if (newMessage.role === 'consultant') {
                  toast({
                    title: 'Expert Response',
                    description: 'Your cybersecurity expert has responded.',
                  });
                }
              }
            },
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'chat_conversations',
              filter: `id=eq.${conversationId}`,
            },
            (payload) => {
              console.log('Conversation updated:', payload.new);
              // Handle conversation status changes (e.g., escalation)
            },
          )
          .subscribe((status) => {
            console.log('Real-time subscription status:', status);
            if (status === 'SUBSCRIBED') {
              setIsConnected(true);
              setConnectionError(null);
            } else if (status === 'CHANNEL_ERROR') {
              setIsConnected(false);
              setConnectionError('Failed to connect to real-time updates');
            }
          });

        channelRef.current = channel;
      } catch (error: any) {
        console.error('Error setting up real-time subscription:', error);
        setConnectionError(error.message);
        setIsConnected(false);
      }
    },
    [user, toast],
  );

  const unsubscribeFromConversation = useCallback(() => {
    if (channelRef.current) {
      console.log('Unsubscribing from real-time updates');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      currentConversationRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const addLocalMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => {
      // Avoid duplicates
      const exists = prev.some((msg) => msg.id === message.id);
      if (exists) return prev;

      return [...prev, message].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
    });
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribeFromConversation();
    };
  }, [unsubscribeFromConversation]);

  // Reconnection logic
  useEffect(() => {
    if (connectionError && currentConversationRef.current) {
      const reconnectTimer = setTimeout(() => {
        console.log('Attempting to reconnect to real-time updates...');
        subscribeToConversation(currentConversationRef.current!);
      }, 5000);

      return () => clearTimeout(reconnectTimer);
    }
  }, [connectionError, subscribeToConversation]);

  return {
    messages,
    isConnected,
    connectionError,
    subscribeToConversation,
    unsubscribeFromConversation,
    addLocalMessage,
    clearMessages,
  };
};

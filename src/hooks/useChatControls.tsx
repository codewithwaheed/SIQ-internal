import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface MessageProcessingStatus {
  id: string;
  conversation_id: string;
  user_message_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  ai_response_id?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

interface ConversationStatus {
  id: string;
  status: 'open' | 'closed' | 'escalated' | 'resolved' | 'active' | 'archived';
  consultant_id?: string;
}

interface UseChatControlsReturn {
  // Message processing
  pollProcessingStatus: (conversationId: string) => Promise<MessageProcessingStatus[]>;
  waitForAIResponse: (
    conversationId: string,
    userMessageId: string,
    timeoutMs?: number,
  ) => Promise<boolean>;

  // Conversation management
  updateConversationStatus: (conversationId: string, newStatus: string) => Promise<boolean>;
  simulateConsultantMessage: (conversationId: string, content: string) => Promise<boolean>;

  // Testing utilities
  getConversationDetails: (conversationId: string) => Promise<ConversationStatus | null>;
  clearProcessingQueue: (conversationId: string) => Promise<boolean>;

  // State
  loading: boolean;
  error: string | null;
}

export const useChatControls = (): UseChatControlsReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleError = useCallback(
    (error: any, defaultMessage: string) => {
      console.error('Chat Controls Error:', error);
      const message = error.message || defaultMessage;
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    },
    [toast],
  );

  // Poll processing status for async AI responses
  const pollProcessingStatus = useCallback(
    async (conversationId: string): Promise<MessageProcessingStatus[]> => {
      try {
        const { data, error } = await supabase
          .from('message_processing_queue')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []) as MessageProcessingStatus[];
      } catch (err: any) {
        handleError(err, 'Failed to poll processing status');
        return [];
      }
    },
    [handleError],
  );

  // Wait for AI response with polling
  const waitForAIResponse = useCallback(
    async (
      conversationId: string,
      userMessageId: string,
      timeoutMs: number = 30000,
    ): Promise<boolean> => {
      const startTime = Date.now();
      const pollInterval = 1000; // 1 second

      return new Promise((resolve) => {
        const poll = async () => {
          try {
            const processingStatuses = await pollProcessingStatus(conversationId);
            const userMessageProcessing = processingStatuses.find(
              (status) => status.user_message_id === userMessageId,
            );

            if (userMessageProcessing) {
              if (userMessageProcessing.status === 'completed') {
                resolve(true);
                return;
              } else if (userMessageProcessing.status === 'failed') {
                resolve(false);
                return;
              }
            }

            // Check timeout
            if (Date.now() - startTime > timeoutMs) {
              resolve(false);
              return;
            }

            // Continue polling
            setTimeout(poll, pollInterval);
          } catch (error) {
            console.error('Error polling for AI response:', error);
            resolve(false);
          }
        };

        poll();
      });
    },
    [pollProcessingStatus],
  );

  // Update conversation status
  const updateConversationStatus = useCallback(
    async (conversationId: string, newStatus: string): Promise<boolean> => {
      if (!user) return false;

      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase.rpc('update_conversation_status', {
          conversation_id: conversationId,
          new_status: newStatus,
          user_id: user.id,
          user_role: 'admin', // Assume admin for testing, in real app get from context
        });

        if (error) throw error;

        toast({
          title: 'Success',
          description: `Conversation status updated to ${newStatus}`,
        });

        return true;
      } catch (err: any) {
        handleError(err, 'Failed to update conversation status');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user, handleError, toast],
  );

  // Simulate consultant message (for testing)
  const simulateConsultantMessage = useCallback(
    async (conversationId: string, content: string): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `https://xfdqnmtzuuphxivsgmua.supabase.co/functions/v1/chat-api/conversations/${conversationId}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              content,
              role: 'consultant',
            }),
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        toast({
          title: 'Success',
          description: 'Consultant message sent successfully',
        });

        return true;
      } catch (err: any) {
        handleError(err, 'Failed to send consultant message');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [handleError, toast],
  );

  // Get conversation details
  const getConversationDetails = useCallback(
    async (conversationId: string): Promise<ConversationStatus | null> => {
      try {
        const { data, error } = await supabase
          .from('chat_conversations')
          .select('id, status, consultant_id')
          .eq('id', conversationId)
          .single();

        if (error) throw error;
        return data as ConversationStatus;
      } catch (err: any) {
        handleError(err, 'Failed to get conversation details');
        return null;
      }
    },
    [handleError],
  );

  // Clear processing queue (for testing)
  const clearProcessingQueue = useCallback(
    async (conversationId: string): Promise<boolean> => {
      try {
        const { error } = await supabase
          .from('message_processing_queue')
          .delete()
          .eq('conversation_id', conversationId);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Processing queue cleared',
        });

        return true;
      } catch (err: any) {
        handleError(err, 'Failed to clear processing queue');
        return false;
      }
    },
    [handleError, toast],
  );

  return {
    // Message processing
    pollProcessingStatus,
    waitForAIResponse,

    // Conversation management
    updateConversationStatus,
    simulateConsultantMessage,

    // Testing utilities
    getConversationDetails,
    clearProcessingQueue,

    // State
    loading,
    error,
  };
};

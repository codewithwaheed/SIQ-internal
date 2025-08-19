import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EscalationOptions {
  conversationId: string;
  reason?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  aiInitiated?: boolean;
}

interface EscalationResult {
  success: boolean;
  escalation?: any;
  assignedConsultant?: string;
  message?: string;
  estimatedWaitTime?: string;
  error?: string;
}

export const useEscalation = () => {
  const [isEscalating, setIsEscalating] = useState(false);
  const { toast } = useToast();

  const escalateConversation = useCallback(async (options: EscalationOptions): Promise<EscalationResult> => {
    setIsEscalating(true);

    try {
      const { data, error } = await supabase.functions.invoke('conversation-escalate', {
        body: options
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        toast({
          title: "Escalated Successfully",
          description: data.message,
        });
      }

      return data;

    } catch (error: any) {
      console.error('Escalation error:', error);
      
      const errorMessage = error.message || "Failed to escalate conversation";
      
      toast({
        title: "Escalation Failed",
        description: errorMessage,
        variant: "destructive"
      });

      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsEscalating(false);
    }
  }, [toast]);

  const checkEscalationStatus = useCallback(async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('status, consultant_id, escalations(id, status, assigned_consultant)')
        .eq('id', conversationId)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return {
        isEscalated: data.status === 'escalated',
        consultantId: data.consultant_id,
        escalations: data.escalations || []
      };

    } catch (error: any) {
      console.error('Error checking escalation status:', error);
      return {
        isEscalated: false,
        consultantId: null,
        escalations: []
      };
    }
  }, []);

  // Helper function for AI to trigger escalation
  const triggerAIEscalation = useCallback(async (conversationId: string, reason: string): Promise<EscalationResult> => {
    return escalateConversation({
      conversationId,
      reason,
      priority: 'normal',
      aiInitiated: true
    });
  }, [escalateConversation]);

  return {
    escalateConversation,
    triggerAIEscalation,
    checkEscalationStatus,
    isEscalating
  };
};
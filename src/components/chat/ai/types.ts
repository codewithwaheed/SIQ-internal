// Shared types for the AI chat feature

export interface Message {
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

export interface Conversation {
  id: string;
  title: string;
  tags: string[];
  updated_at: string;
  created_at: string;
  chat_messages?: { count?: number }[];
}

export interface CurrentConversation {
  id: string;
  title: string;
  tags: string[];
}

export interface AiChatInterfaceProps {
  isDemo?: boolean;
  className?: string;
}

export type PolicyType = import('@/lib/policyGenerator').PolicyType;

export interface PolicyGenerationState {
  isActive: boolean;
  policyType: PolicyType | null;
  template: string | null;
  missingFields: string[];
  currentFieldGroup: number;
  userAnswers: Record<string, string>;
  generatedPolicy: string | null;
  isGenerating: boolean;
}

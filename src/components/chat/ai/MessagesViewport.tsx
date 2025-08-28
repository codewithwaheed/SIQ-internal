import { ContextManager } from '@/components/chat/ContextManager';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { PolicyGenerationInterface } from '@/components/chat/PolicyGenerationInterface';
import { ContextualEscalationCard } from '@/components/chat/ContextualEscalationCard';
import { SmartEscalationTriggers } from '@/components/chat/SmartEscalationTriggers';
import { POLICY_TEMPLATES } from '@/lib/policyGenerator';
import type { Message, CurrentConversation } from './types';

interface Props {
  isDemo: boolean;
  user: any;
  uploadedDocuments: any[];
  activeDocuments: string[];
  onToggleDocument: (docId: string) => void;
  onClearContext: () => void;
  messages: Message[];
  currentConversation: CurrentConversation | null;
  conversationId?: string | null; // helps show feedback icons on hard refresh
  onCopyMessage: (content: string) => void;
  onMessageReaction: (id: string, reaction: 'up' | 'down') => void;
  onSuggestionClick: (text: string) => void;
  policyGenerationState: {
    isActive: boolean;
    policyType: any;
    missingFields: string[];
    isGenerating: boolean;
    generatedPolicy: string | null;
  };
  onPolicyFieldsSubmit: (answers: Record<string, string>) => void;
  onPolicyUseDefaults: () => void;
  showContextualEscalation: boolean;
  escalationRationale: string | null;
  onCloseEscalationCard: () => void;
  conversationContext: { documentCount: number; messageCount: number };
  sessionStart: Date;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  topSentinelRef: React.RefObject<HTMLDivElement>;
  initialLoading?: boolean;
  olderLoading?: boolean;
}

export function MessagesViewport({
  isDemo,
  user,
  uploadedDocuments,
  activeDocuments,
  onToggleDocument,
  onClearContext,
  messages,
  currentConversation,
  conversationId,
  onCopyMessage,
  onMessageReaction,
  onSuggestionClick,
  policyGenerationState,
  onPolicyFieldsSubmit,
  onPolicyUseDefaults,
  showContextualEscalation,
  escalationRationale,
  onCloseEscalationCard,
  conversationContext,
  sessionStart,
  messagesEndRef,
  topSentinelRef,
  initialLoading = false,
  olderLoading = false,
}: Props) {
  const SkeletonRow = () => (
    <div className="animate-pulse">
      <div className="mb-2 h-3 w-24 rounded bg-foreground/10" />
      <div className="h-16 w-full rounded-md bg-foreground/10" />
    </div>
  );

  return (
    <main className="app-content-inner">
      <div className="mx-auto max-w-5xl space-y-4 px-3 py-3 sm:space-y-6 sm:px-4">
        {/* TOP SENTINEL for infinite scroll */}
        <div ref={topSentinelRef} aria-hidden />

        {olderLoading && (
          <div className="flex items-center justify-center py-2 text-xs text-muted-foreground">
            Loading older messages…
          </div>
        )}

        {!isDemo && user && uploadedDocuments.length > 0 && (
          <ContextManager
            documents={uploadedDocuments}
            activeDocuments={activeDocuments}
            onDocumentToggle={onToggleDocument}
            onClearContext={onClearContext}
            className="mb-2"
          />
        )}

        {initialLoading ? (
          <div className="space-y-4">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <ChatMessage
                key={message.id || index}
                message={message}
                conversationId={conversationId ?? currentConversation?.id}
                isLatest={index === messages.length - 1}
                isDemo={isDemo}
                user={user}
                messages={messages}
                onCopyMessage={onCopyMessage}
                onMessageReaction={onMessageReaction}
                onSuggestionClick={onSuggestionClick}
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
                  onFieldsSubmit={onPolicyFieldsSubmit}
                  onUseDefaults={onPolicyUseDefaults}
                  isGenerating={policyGenerationState.isGenerating}
                  generatedPolicy={policyGenerationState.generatedPolicy}
                  templateUsed={policyGenerationState.policyType || undefined}
                  messageId={
                    policyGenerationState.generatedPolicy
                      ? messages.find((m) => m.content === policyGenerationState.generatedPolicy)
                          ?.id
                      : undefined
                  }
                />
              </div>
            )}

            {!isDemo && user && showContextualEscalation && escalationRationale && (
              <ContextualEscalationCard
                messages={messages}
                rationale={escalationRationale}
                onClose={onCloseEscalationCard}
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
          </>
        )}

        <div ref={messagesEndRef} />
      </div>
    </main>
  );
}

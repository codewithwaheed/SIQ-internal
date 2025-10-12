import { ContextManager } from '@/components/chat/ContextManager';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { PolicyGenerationInterface } from '@/components/chat/PolicyGenerationInterface';
import { PolicyDraftActionsInline } from '@/components/chat/PolicyDraftActionsInline';
import { PolicyFormDynamic } from '@/components/chat/PolicyFormDynamic';
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
            {messages.map((message, index) => {
              const isLatest = index === messages.length - 1;
              const isPolicySchemaMsg = message.metadata?.type === 'policy_schema';
              const isPolicyDraftMsg = message.metadata?.type === 'policy_draft';
              const showEmbeddedSchema =
                isPolicySchemaMsg &&
                policyGenerationState.isActive &&
                !policyGenerationState.generatedPolicy &&
                policyGenerationState.formSchema &&
                Array.isArray(policyGenerationState.formSchema) &&
                policyGenerationState.formSchema.length > 0;

              const afterContent = showEmbeddedSchema ? (
                <div className="mt-4">
                  {policyGenerationState.isGenerating ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-current" />
                      Generating policy…
                    </div>
                  ) : (
                    <PolicyFormDynamic
                      embedded
                      title={
                        policyGenerationState.schemaTitle ||
                        (policyGenerationState.policyType
                          ? POLICY_TEMPLATES[policyGenerationState.policyType].title
                          : 'Policy')
                      }
                      subtitle={policyGenerationState.schemaGuidance || undefined}
                      schema={policyGenerationState.formSchema!}
                      onSubmit={onPolicyFieldsSubmit}
                      onUseDefaults={onPolicyUseDefaults}
                      disabled={
                        policyGenerationState.isGenerating ||
                        policyGenerationState.schemaCanContinue === false
                      }
                    />
                  )}
                </div>
              ) : isPolicyDraftMsg ? (
                <div className="mt-4">
                  <PolicyDraftActionsInline
                    policyTitle={
                      (policyGenerationState.schemaTitle && policyGenerationState.schemaTitle.trim())
                        ? policyGenerationState.schemaTitle.trim()
                        : (message.content.match(/^#\s+(.+)$/m)?.[1] || 'Policy')
                    }
                    policyType={policyGenerationState.policyType || undefined}
                    content={message.content}
                    messageId={message.id}
                  />
                </div>
              ) : undefined;

              return (
                <ChatMessage
                  key={message.id || index}
                  message={message}
                  conversationId={conversationId ?? currentConversation?.id}
                  isLatest={isLatest}
                  isDemo={isDemo}
                  user={user}
                  messages={messages}
                  onCopyMessage={onCopyMessage}
                  onMessageReaction={onMessageReaction}
                  onSuggestionClick={onSuggestionClick}
                  afterContent={afterContent}
                />
              );
            })}

            {/* No global draft UI; drafts are embedded under their respective assistant messages */}

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

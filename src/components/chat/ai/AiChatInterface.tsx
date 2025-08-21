import { ChatHeader } from './ChatHeader';
import { ChatHistoryPanel } from './ChatHistoryPanel';
import { EmptyStateHero } from './EmptyStateHero';
import { MessagesViewport } from './MessagesViewport';
import { ComposerShell } from './ComposerShell';
import { DocumentUploadTray } from './DocumentUploadTray';
import { NewMessageIndicator } from './NewMessageIndicator';

import { useAiChatController } from './hooks/useAiChatController';
import type { AiChatInterfaceProps } from './types';
import { PersistentEscalationCTA } from '@/components/chat/PersistentEscalationCTA';
import { DocumentUpload } from '@/components/chat/DocumentUpload';

export const AiChatInterface = ({ isDemo = false, className = '' }: AiChatInterfaceProps) => {
  const c = useAiChatController(isDemo);

  // Chat History panel (unchanged visuals)
  if (c.showChatHistory) {
    return (
      <ChatHistoryPanel
        className={className}
        filteredConversations={c.filteredConversations}
        allTags={c.allTags}
        selectedTag={c.selectedTag}
        setSelectedTag={c.setSelectedTag}
        searchTerm={c.searchTerm}
        setSearchTerm={c.setSearchTerm}
        startNewConversation={c.startNewConversation}
        loadConversation={c.loadConversation}
        deleteConversation={c.deleteConversation}
        onBackToChat={() => c.setShowChatHistory(false)}
      />
    );
  }

  // Empty hero
  if (c.messages.length === 0) {
    return (
      <EmptyStateHero
        sidebarCollapsed={c.sidebarCollapsed}
        userFirstName={c.userFirstName}
        timeOfDay={c.timeOfDay}
        suggestedPrompts={c.suggestedPrompts}
        isDemo={c.isDemo}
        user={c.user}
        showDocumentUpload={c.showDocumentUpload}
        onToggleDocumentUpload={() => c.setShowDocumentUpload(!c.showDocumentUpload)}
        onPromptClick={(p) => {
          c.setInput(p);
          c.setMessageToSend(p);
        }}
        composerRef={c.composerRef}
        input={c.input}
        documentUploadSlot={<DocumentUpload onDocumentUploaded={c.handleDocumentUploaded} />}
      >
        <ComposerShell
          input={c.input}
          setInput={c.setInput}
          loading={c.loading}
          isDemo={c.isDemo}
          user={c.user}
          conversations={c.conversations}
          uploadedDocuments={c.uploadedDocuments}
          messages={c.messages}
          onSendMessage={c.handleSendMessage}
          onKeyPress={c.handleKeyPress}
          onShowChatHistory={() => c.setShowChatHistory(true)}
          onToggleDocumentUpload={() => c.setShowDocumentUpload(!c.showDocumentUpload)}
          onDocumentUploaded={c.handleDocumentUploaded}
          inputRef={c.inputRef}
          abortController={c.abortController}
          onStopGeneration={c.handleStopGeneration}
          setMessageToSend={c.setMessageToSend}
        />
      </EmptyStateHero>
    );
  }

  // Main chat
  return (
    <div className={`page flex h-full flex-col ${c.sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <ChatHeader
        isDemo={c.isDemo}
        user={c.user}
        currentConversation={c.currentConversation}
        editingTitle={c.editingTitle}
        editTitleValue={c.editTitleValue}
        startEditingTitle={c.startEditingTitle}
        cancelEditingTitle={c.cancelEditingTitle}
        saveTitle={c.saveTitle}
        setEditTitleValue={c.setEditTitleValue}
      />

      <div className="app-content flex-1 overflow-y-auto" ref={c.messagesContainerRef} onScroll={c.handleScroll}>
        <MessagesViewport
          isDemo={c.isDemo}
          user={c.user}
          uploadedDocuments={c.uploadedDocuments}
          activeDocuments={c.activeDocuments}
          onToggleDocument={(docId) =>
            c.setActiveDocuments((prev) => (prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]))
          }
          onClearContext={() => c.setActiveDocuments([])}
          messages={c.messages}
          currentConversation={c.currentConversation}
          onCopyMessage={c.copyMessage}
          onMessageReaction={c.handleMessageReaction}
          onSuggestionClick={c.handleSuggestionClick}
          policyGenerationState={c.policyGenerationState}
          onPolicyFieldsSubmit={c.handlePolicyFieldsSubmit}
          onPolicyUseDefaults={c.handlePolicyUseDefaults}
          showContextualEscalation={c.showContextualEscalation}
          escalationRationale={c.escalationRationale}
          onCloseEscalationCard={() => {
            c.setShowContextualEscalation(false);
            c.setEscalationRationale(null);
          }}
          conversationContext={c.conversationContext}
          sessionStart={c.sessionStart}
          messagesEndRef={c.messagesEndRef}
        />

        <NewMessageIndicator show={c.showNewMessageIndicator} onClick={c.scrollToBottomAndMarkRead} />
        <DocumentUploadTray show={c.showDocumentUpload} user={c.user} isDemo={c.isDemo} onDocumentUploaded={c.handleDocumentUploaded} />
      </div>

      <div className="chat-composer">
        <div className="composer-shell" ref={c.composerRef}>
          <div className="inner">
            <ComposerShell
              input={c.input}
              setInput={c.setInput}
              loading={c.loading}
              isDemo={c.isDemo}
              user={c.user}
              conversations={c.conversations}
              uploadedDocuments={c.uploadedDocuments}
              messages={c.messages}
              onSendMessage={c.handleSendMessage}
              onKeyPress={c.handleKeyPress}
              onShowChatHistory={() => c.setShowChatHistory(true)}
              onToggleDocumentUpload={() => c.setShowDocumentUpload(!c.showDocumentUpload)}
              onDocumentUploaded={c.handleDocumentUploaded}
              inputRef={c.inputRef}
              abortController={c.abortController}
              onStopGeneration={c.handleStopGeneration}
              setMessageToSend={c.setMessageToSend}
            />
          </div>
        </div>
      </div>

      {!c.isDemo && c.user && c.messages.length > 2 && (
        <PersistentEscalationCTA messages={c.messages} position="floating" />
      )}
    </div>
  );
};

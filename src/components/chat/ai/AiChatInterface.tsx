import { ChatHeader } from './ChatHeader';
import { ChatHistoryPanel } from './ChatHistoryPanel';
import { EmptyStateHero } from './EmptyStateHero';
import { MessagesViewport } from './MessagesViewport';
import { ComposerShell } from './ComposerShell';
import { DocumentUploadTray } from './DocumentUploadTray';
import { NewMessageIndicator } from './NewMessageIndicator';

import useAiChatController from './hooks/useAiChatController';
import type { AiChatInterfaceProps } from './types';
import { PersistentEscalationCTA } from '@/components/chat/PersistentEscalationCTA';
import { DocumentUpload } from '@/components/chat/DocumentUpload';
import AlwaysVisibleScrollbar from './AlwaysVisibleScrollbar';
import { useEffect } from 'react';

export const AiChatInterface = ({ isDemo = false, className = '' }: AiChatInterfaceProps) => {
  const c = useAiChatController(isDemo);
  useEffect(() => {
    document.body.classList.add('no-doc-scroll');
    return () => document.body.classList.remove('no-doc-scroll');
  }, []);
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
        /** highlight current conversation in the list */
        currentConversationId={c.currentConversationId || undefined}
      />
    );
  }

  if (!c.initialLoading && c.messages.length === 0) {
    return (
      <div
        className={`flex h-[100dvh] min-h-0 flex-col overflow-hidden ${
          c.sidebarCollapsed ? 'sidebar-collapsed' : ''
        }`}
      >
        {/* Scroll container with sticky ChatHeader for empty-state view */}
        <div
          className="app-content hide-native-scrollbar relative min-h-0 flex-1 overflow-y-auto pb-28 md:pb-32"
          ref={c.messagesContainerRef}
          onScroll={c.handleScroll}
        >
          <div className="sticky top-0 z-20 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <ChatHeader
              isDemo={c.isDemo}
              user={c.user}
              currentConversation={c.currentConversation}
              editingTitle={c.editingTitle}
              editTitleValue={c.editTitleValue}
              conversations={c.conversations}
              startEditingTitle={c.startEditingTitle}
              cancelEditingTitle={c.cancelEditingTitle}
              saveTitle={c.saveTitle}
              setEditTitleValue={c.setEditTitleValue}
              onShowChatHistory={() => c.setShowChatHistory(true)}
            />
          </div>

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
            documentUploadSlot={
              <DocumentUpload
                onDocumentUploaded={c.handleDocumentUploaded}
                conversationId={c.currentConversationId}
              />
            }
          >
            <ComposerShell
              input={c.input}
              setInput={c.setInput}
              loading={c.loading}
              isDemo={c.isDemo}
              user={c.user}
              conversationId={c.currentConversationId}
              uploadedDocuments={c.uploadedDocuments}
              messages={c.messages}
              onSendMessage={c.handleSendMessage}
              onKeyPress={c.handleKeyPress}
              onToggleDocumentUpload={() => c.setShowDocumentUpload(!c.showDocumentUpload)}
              onDocumentUploaded={c.handleDocumentUploaded}
              onImagesSubmitted={(message, images) => c.sendImagesMessage(message, images)}
              onDocumentsSubmitted={(message, ids, names, meta) =>
                c.sendMessageWithDocuments(message, ids, names, meta)
              }
              inputRef={c.inputRef}
              abortController={c.abortController}
              onStopGeneration={c.handleStopGeneration}
              setMessageToSend={c.setMessageToSend}
              indexingBlocked={c.indexingBlocked}
              indexingHint={c.indexingHint}
            />
          </EmptyStateHero>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ paddingTop: '10px' }}
      className={`flex h-[100dvh] min-h-0 w-full max-w-none flex-col overflow-hidden pt-0 ${
        c.sidebarCollapsed ? 'sidebar-collapsed' : ''
      } ${className}`}
    >
      {/* SINGLE scroll container. Padding-bottom leaves room for composer */}
      <div
        className="app-content hide-native-scrollbar relative min-h-0 flex-1 overflow-y-auto pb-28 md:pb-32"
        ref={c.messagesContainerRef}
        onScroll={c.handleScroll}
        aria-busy={c.initialLoading ? 'true' : 'false'}
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-20 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <ChatHeader
            isDemo={c.isDemo}
            user={c.user}
            currentConversation={c.currentConversation}
            editingTitle={c.editingTitle}
            editTitleValue={c.editTitleValue}
            conversations={c.conversations}
            startEditingTitle={c.startEditingTitle}
            cancelEditingTitle={c.cancelEditingTitle}
            saveTitle={c.saveTitle}
            setEditTitleValue={c.setEditTitleValue}
            onShowChatHistory={() => c.setShowChatHistory(true)}
          />
        </div>

        {/* NEW: tiny loader strip while older messages are fetching */}
        {c.olderLoading && (
          <div className="sticky top-[52px] z-10 mb-2 flex justify-center">
            <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground shadow">
              <span className="h-3 w-3 animate-spin rounded-full border border-muted-foreground/40 border-t-transparent" />
              <span>Loading earlier messages…</span>
            </div>
          </div>
        )}

        {/* Skeleton */}
        {c.initialLoading && (
          <div className="mx-auto w-full max-w-4xl px-3 pb-6 pt-3">
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-28 rounded bg-primary/10" />
                    <div className="h-20 w-full rounded-lg bg-primary/10" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!c.initialLoading && (
          <>
            <MessagesViewport
              isDemo={c.isDemo}
              user={c.user}
              uploadedDocuments={c.uploadedDocuments}
              activeDocuments={c.activeDocuments}
              onToggleDocument={(docId) =>
                c.setActiveDocuments((prev) =>
                  prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId],
                )
              }
              onClearContext={() => c.setActiveDocuments([])}
              messages={c.messages}
              currentConversation={c.currentConversation}
              conversationId={c.currentConversationId}
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
              topSentinelRef={c.topSentinelRef}
            />

            <NewMessageIndicator
              show={c.showNewMessageIndicator}
              onClick={c.scrollToBottomAndMarkRead}
            />
            <DocumentUploadTray
              show={c.showDocumentUpload}
              user={c.user}
              isDemo={c.isDemo}
              conversationId={c.currentConversationId}
              onDocumentUploaded={c.handleDocumentUploaded}
              onUploadAndAsk={(message, ids, names) => {
                c.setShowDocumentUpload(false);
                c.sendMessageWithDocuments(message, ids, names);
              }}
            />
          </>
        )}
      </div>

      {/* Composer sits OUTSIDE the scroll container (fixed-like). */}
      <div className="chat-composer">
        <div className="composer-shell" ref={c.composerRef}>
          <div className="inner">
            <ComposerShell
              input={c.input}
              setInput={c.setInput}
              loading={c.loading}
              isDemo={c.isDemo}
              user={c.user}
              conversationId={c.currentConversationId}
              conversations={c.conversations}
              uploadedDocuments={c.uploadedDocuments}
              messages={c.messages}
              onSendMessage={c.handleSendMessage}
              onKeyPress={c.handleKeyPress}
              onShowChatHistory={() => c.setShowChatHistory(true)}
              onToggleDocumentUpload={() => c.setShowDocumentUpload(!c.showDocumentUpload)}
              onDocumentUploaded={c.handleDocumentUploaded}
              onImagesSubmitted={(message, images) => c.sendImagesMessage(message, images)}
              onDocumentsSubmitted={(message, ids, names, meta) =>
                c.sendMessageWithDocuments(message, ids, names, meta)
              }
              inputRef={c.inputRef}
              abortController={c.abortController}
              onStopGeneration={c.handleStopGeneration}
              setMessageToSend={c.setMessageToSend}
              indexingBlocked={c.indexingBlocked}
              indexingHint={c.indexingHint}
            />
          </div>
        </div>
      </div>

      {!c.isDemo && c.user && c.messages.length > 2 && (
        <PersistentEscalationCTA messages={c.messages} position="floating" />
      )}

      {/* Always-visible scrollbar */}
      <AlwaysVisibleScrollbar
        containerRef={c.messagesContainerRef as any}
        watch={c.messages.length}
      />
    </div>
  );
};

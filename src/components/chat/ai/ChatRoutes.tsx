import { Routes, Route, Navigate } from 'react-router-dom';
import { AiChatInterface } from './AiChatInterface';
import { ChatHistoryPanel } from './ChatHistoryPanel';
import { useAiChatController } from './hooks/useAiChatController';

type Props = {
  isDemo?: boolean;
  className?: string;
};

export function ChatRoutes({ isDemo = false, className = '' }: Props) {
  const c = useAiChatController(!!isDemo);

  return (
    <Routes>
      {/* /dashboard/chat */}
      <Route index element={<AiChatInterface isDemo={isDemo} className={className} controller={c} />} />

      {/* /dashboard/chat/new */}
      <Route path="new" element={<AiChatInterface isDemo={isDemo} className={className} controller={c} />} />

      {/* /dashboard/chat/c/:conversationId */}
      <Route path="c/:conversationId" element={<AiChatInterface isDemo={isDemo} className={className} controller={c} />} />

      {/* /dashboard/chat/history */}
      <Route
        path="history"
        element={
          <ChatHistoryPanel
            className={className}
            filteredConversations={c.filteredConversations}
            allTags={c.allTags}
            selectedTag={c.selectedTag}
            setSelectedTag={c.setSelectedTag}
            searchTerm={c.searchTerm}
            setSearchTerm={c.setSearchTerm}
            startNewConversation={c.startNewConversation}
            loadConversation={(id) => c.loadConversation(id)}
            deleteConversation={c.deleteConversation}
            onBackToChat={() => c.navigateToChatHome()}
          />
        }
      />

      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
}

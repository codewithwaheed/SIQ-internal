import { SensitiveDataDetector } from '@/components/chat/SensitiveDataDetector';
import { MessageInputBox } from '@/components/chat/MessageInputBox';

import type { Conversation, Message } from './types';

interface Props {
  input: string;
  setInput: (v: string) => void;
  loading: boolean;
  isDemo: boolean;
  user: any;
  conversations: Conversation[];
  uploadedDocuments: any[];
  messages: Message[];
  onSendMessage: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onShowChatHistory: () => void;
  onToggleDocumentUpload: () => void;
  onDocumentUploaded: (doc: any) => void;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  abortController: AbortController | null;
  onStopGeneration: () => void;
  setMessageToSend: (masked: string) => void;
}

export function ComposerShell({
  input,
  setInput,
  loading,
  isDemo,
  user,
  conversations,
  uploadedDocuments,
  messages,
  onSendMessage,
  onKeyPress,
  onShowChatHistory,
  onToggleDocumentUpload,
  onDocumentUploaded,
  inputRef,
  abortController,
  onStopGeneration,
  setMessageToSend,
}: Props) {
  return (
    <>
      <SensitiveDataDetector content={input} onContentMasked={setMessageToSend} />
      <MessageInputBox
        input={input}
        loading={loading}
        isDemo={isDemo}
        user={user}
        conversations={conversations}
        uploadedDocuments={uploadedDocuments}
        messages={messages}
        onInputChange={setInput}
        onSendMessage={onSendMessage}
        onKeyPress={onKeyPress}
        onShowChatHistory={onShowChatHistory}
        onShowDocumentUpload={onToggleDocumentUpload}
        onDocumentUploaded={onDocumentUploaded}
        inputRef={inputRef}
        abortController={abortController}
        onStopGeneration={onStopGeneration}
      />
    </>
  );
}

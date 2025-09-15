import { SensitiveDataDetector } from '@/components/chat/SensitiveDataDetector';
import { MessageInputBox } from '@/components/chat/MessageInputBox';

import type { Conversation, Message } from './types';

interface Props {
  input: string;
  setInput: (v: string) => void;
  loading: boolean;
  isDemo: boolean;
  user: any;
  uploadedDocuments: any[];
  messages: Message[];
  onSendMessage: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onToggleDocumentUpload: () => void;
  onDocumentUploaded: (doc: any) => void;
  onImagesSubmitted?: (message: string, images: Array<{ name: string; previewUrl: string }>) => void;
  onDocumentsSubmitted?: (
    message: string,
    documentIds: string[],
    documentNames: string[],
    documentMeta?: Array<{ id: string; name: string; type?: string; size?: number }>,
  ) => void;
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
  uploadedDocuments,
  messages,
  onSendMessage,
  onKeyPress,
  onToggleDocumentUpload,
  onDocumentUploaded,
  onImagesSubmitted,
  onDocumentsSubmitted,
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
        uploadedDocuments={uploadedDocuments}
        messages={messages}
        onInputChange={setInput}
        onSendMessage={onSendMessage}
        onKeyPress={onKeyPress}
        onShowDocumentUpload={onToggleDocumentUpload}
        onDocumentUploaded={onDocumentUploaded}
        onImagesSubmitted={onImagesSubmitted}
        onDocumentsSubmitted={onDocumentsSubmitted}
        inputRef={inputRef}
        abortController={abortController}
        onStopGeneration={onStopGeneration}
      />
    </>
  );
}

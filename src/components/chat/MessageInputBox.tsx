import { ArrowUp, History, Upload, Crown, Square, FileClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip } from '@/components/ui/custom-tooltip';
import { DocumentUpload } from './DocumentUpload';
import { InlineUpgradeNudge, UpgradePrompt } from '@/components/ui/feature-gate';
import { useFeatureGating } from '@/hooks/useFeatureGating';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface MessageInputBoxProps {
  input: string;
  loading: boolean;
  isDemo: boolean;
  user: any;
  conversations: any[];
  uploadedDocuments: any[];
  messages: any[];
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onShowChatHistory: () => void;
  onShowDocumentUpload: () => void;
  onDocumentUploaded?: (document: any) => void;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  abortController?: AbortController | null;
  onStopGeneration?: () => void;
  isEscalated?: boolean;
  escalationInfo?: any;
}

export const MessageInputBox = ({
  input,
  loading,
  isDemo,
  user,
  conversations,
  uploadedDocuments,
  messages,
  onInputChange,
  onSendMessage,
  onKeyPress,
  onShowChatHistory,
  onShowDocumentUpload,
  onDocumentUploaded,
  inputRef,
  abortController,
  onStopGeneration,
  isEscalated = false,
  escalationInfo,
}: MessageInputBoxProps) => {
  const { checkFeatureAccess } = useFeatureGating();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const handleUploadClick = () => {
    const access = checkFeatureAccess('document_upload');
    if (access.hasAccess) {
      onShowDocumentUpload();
    } else {
      setUpgradeOpen(true);
    }
  };

  const access = checkFeatureAccess('document_upload');
  const premiumIcon = <Crown className="absolute -right-1 -top-1 h-3 w-3 text-yellow-500" />;

  return (
    <div className="w-full p-3 sm:p-4">
      <div className="flex w-full items-end gap-2 sm:gap-3">
        {/* Left Actions - Mobile Optimized */}
        <div className="flex items-center gap-1 sm:gap-2">
          {!isDemo && user && (
            <>
              {/* History Button with Badge - Larger Touch Target */}
              <Tooltip
                content={`Chat History${conversations.length > 0 ? ` (${conversations.length})` : ''}`}
              >
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={onShowChatHistory}
                  className="relative bg-gray-50 h-10 w-10 touch-manipulation rounded-xl text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground sm:h-9 sm:w-9"
                >
                  {/* <History className="h-5 w-5 sm:h-4 sm:w-4" /> */}
                  <FileClock className="h-5 w-5 sm:h-4 sm:w-4" />
                </Button>
              </Tooltip>

              {/* Direct Upload Button with Immediate Dialog */}
              {onDocumentUploaded ? (
                 <DocumentUpload
                 onDocumentUploaded={onDocumentUploaded}
                 trigger={
                   <div className="relative">
                     <Button
                       size="icon"
                       variant="ghost"
                       className="relative bg-gray-50  h-10 w-10 touch-manipulation rounded-xl text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground sm:h-9 sm:w-9"
                     >
                       <Upload className="h-5 w-5 sm:h-4 sm:w-4" />
                     </Button>
             
                     {/* Crown badge (only when no access + no docs uploaded) */}
                     {!access.hasAccess && uploadedDocuments.length === 0 && (
                       <span className="absolute top-1 right-2 flex h-3 w-3 items-center justify-center rounded-full">
                         <span className="text-[10px] text-white">{premiumIcon}</span>
                       </span>
                     )}
                   </div>
                 }
               />
              ) : ( 
                <Tooltip
                  content={`Upload Documents${uploadedDocuments.length > 0 ? ` (${uploadedDocuments.length} uploaded)` : ''}`}
                >
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleUploadClick}
                    className="relative h-10 w-10 touch-manipulation rounded-xl text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground sm:h-9 sm:w-9"
                  >
                    <Upload className="h-5 w-5 sm:h-4 sm:w-4" />
                    {!access.hasAccess && uploadedDocuments.length === 0 && premiumIcon}
                  </Button>
                </Tooltip>
              )}
            </>
          )}
        </div>

        {/* Input Area - Mobile Optimized */}
        <div className="relative min-w-0 flex-1">
          <Textarea
            ref={inputRef}
            placeholder={
              loading
                ? isEscalated
                  ? 'Expert is responding...'
                  : 'AI is responding...'
                : isEscalated
                  ? 'Type your message to the cybersecurity expert...'
                  : 'What cybersecurity challenge can I help you solve today?'
            }
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={onKeyPress}
            disabled={loading}
            className="max-h-[120px] min-h-[48px] touch-manipulation resize-none rounded-xl border border-border/30 bg-background px-3 py-3 text-base transition-all placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring sm:px-4"
          />
        </div>

        {/* Right Actions - Mobile Optimized */}
        <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2">
          {/* Send/Stop Button - Dynamic based on loading state */}
          {loading && abortController ? (
            <Button
              size="icon"
              onClick={onStopGeneration}
              className="h-12 w-12 touch-manipulation rounded-xl bg-destructive text-destructive-foreground transition-all duration-200 hover:bg-destructive/90 sm:h-10 sm:w-10"
            >
              <Square className="h-5 w-5 sm:h-4 sm:w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={onSendMessage}
              disabled={loading || !input.trim()}
              className={`h-12 w-12 touch-manipulation rounded-xl transition-all duration-200 sm:h-10 sm:w-10 ${
                loading
                  ? 'cursor-not-allowed bg-muted text-muted-foreground'
                  : input.trim()
                    ? 'bg-primary text-primary-foreground shadow-md hover:scale-105 hover:bg-primary/90 hover:shadow-lg'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent sm:h-4 sm:w-4" />
              ) : (
                <ArrowUp className="h-5 w-5 sm:h-4 sm:w-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Upgrade Prompt for Document Upload */}
      <UpgradePrompt
        feature="document_upload"
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        trigger={<></>}
      />
    </div>
  );
};

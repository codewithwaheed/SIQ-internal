import { ArrowUp, Upload, Crown, Square, FileClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip } from '@/components/ui/custom-tooltip';
import { DocumentUpload } from './DocumentUpload';
import { UpgradePrompt } from '@/components/ui/feature-gate';
import { useFeatureGating } from '@/hooks/useFeatureGating';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

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
}: MessageInputBoxProps) => {
  const { checkFeatureAccess } = useFeatureGating();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const access = checkFeatureAccess('document_upload');

  // Auto-expand (1–6 lines)
  useEffect(() => {
    if (!inputRef.current) return;
    const el = inputRef.current;
    el.style.height = '0px';
    const line = 20;
    const max = 6 * line + 16;
    el.style.height = Math.max(Math.min(el.scrollHeight, max), 44) + 'px';
  }, [input, inputRef]);

  const handleUploadClick = () => {
    const feature = checkFeatureAccess('document_upload');
    if (feature.hasAccess) onShowDocumentUpload();
    else setUpgradeOpen(true);
  };

  // Darker neutral by default; brand + white on hover; perfectly centered
  const iconBtn = cn(
    'inline-flex items-center justify-center',
    'h-11 w-11 sm:h-10 sm:w-10 rounded-xl transition-all',
    'bg-muted/80 text-foreground/80', // darker idle
    'hover:bg-primary hover:text-primary-foreground',
    'active:scale-[0.98] focus-visible:ring-0',
  );

  const sendBtn = (enabled: boolean) =>
    cn(
      'inline-flex items-center justify-center h-11 w-11 sm:h-10 sm:w-10 rounded-xl transition-all',
      enabled
        ? 'bg-primary text-primary-foreground shadow hover:scale-[1.03] hover:bg-primary/90'
        : 'bg-muted/70 text-foreground/50 cursor-not-allowed',
    );

  return (
    <div className="w-full px-2 pb-[env(safe-area-inset-bottom)] pt-2 sm:px-3">
      {/* Align EVERYTHING vertically centered */}
      <div className="mx-auto flex w-full max-w-4xl items-center gap-2 sm:gap-3">
        {/* Left actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {!isDemo && user && (
            <>
              <Tooltip
                content={`Chat History${conversations.length ? ` (${conversations.length})` : ''}`}
              >
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={onShowChatHistory}
                  aria-label="Open chat history"
                  className={iconBtn}
                >
                  <FileClock className="h-5 w-5 sm:h-4 sm:w-4" />
                </Button>
              </Tooltip>

              {onDocumentUploaded ? (
                <DocumentUpload
                  onDocumentUploaded={onDocumentUploaded}
                  trigger={
                    <div className="relative">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Upload documents"
                        className={iconBtn}
                      >
                        <Upload className="h-5 w-5 sm:h-4 sm:w-4" />
                      </Button>
                      {!access.hasAccess && uploadedDocuments.length === 0 && (
                        <span className="absolute -right-1 -top-1">
                          <Crown className="h-3 w-3 text-yellow-500" />
                        </span>
                      )}
                    </div>
                  }
                />
              ) : (
                <Tooltip
                  content={`Upload Documents${uploadedDocuments.length ? ` (${uploadedDocuments.length})` : ''}`}
                >
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleUploadClick}
                    aria-label="Upload documents"
                    className={iconBtn}
                  >
                    <Upload className="h-5 w-5 sm:h-4 sm:w-4" />
                    {!access.hasAccess && uploadedDocuments.length === 0 && (
                      <span className="absolute -right-1 -top-1">
                        <Crown className="h-3 w-3 text-yellow-500" />
                      </span>
                    )}
                  </Button>
                </Tooltip>
              )}
            </>
          )}
        </div>

        {/* Textarea — slightly darker background, no heavy border */}
        <div className="relative min-w-0 flex-1">
          <Textarea
            ref={inputRef}
            placeholder={
              loading
                ? isEscalated
                  ? 'Expert is responding…'
                  : 'AI is responding…'
                : isEscalated
                  ? 'Message your cybersecurity expert…'
                  : 'Ask anything about security, compliance, or policies…'
            }
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={onKeyPress}
            disabled={loading}
            rows={1}
            className={cn(
              'max-h-[160px] min-h-[44px] w-full resize-none rounded-2xl',
              'border-0 bg-muted/70 shadow-inner', // darker input background
              'px-3 py-2.5 text-[15px] leading-5 sm:px-4 sm:py-3',
              'placeholder:text-muted-foreground/70',
              'focus-visible:ring-1 focus-visible:ring-primary/30',
            )}
            aria-label="Type your message"
          />
        </div>

        {/* Right actions */}
        <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2">
          {loading && abortController ? (
            <Button
              size="icon"
              onClick={onStopGeneration}
              aria-label="Stop generating"
              className={cn(
                'inline-flex h-11 w-11 items-center justify-center rounded-xl transition-all sm:h-10 sm:w-10',
                'bg-destructive text-destructive-foreground hover:bg-destructive/90',
              )}
            >
              <Square className="h-5 w-5 sm:h-4 sm:w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={onSendMessage}
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className={sendBtn(!loading && !!input.trim())}
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

      {/* helper text */}
      <p className="mx-auto mt-1.5 w-full max-w-4xl text-center text-[11px] text-muted-foreground sm:text-xs">
        Press <kbd className="rounded border px-1">Enter</kbd> to send •{' '}
        <span className="whitespace-nowrap">
          <kbd className="rounded border px-1">Shift</kbd> +{' '}
          <kbd className="rounded border px-1">Enter</kbd> for a new line
        </span>
      </p>

      <UpgradePrompt
        feature="document_upload"
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        trigger={<></>}
      />
    </div>
  );
};

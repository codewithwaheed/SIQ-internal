import { ArrowUp, History, Upload, Crown, Square } from 'lucide-react';
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
  escalationInfo
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
  const premiumIcon = (
    <Crown className="w-3 h-3 absolute -top-1 -right-1 text-blue-500" />
  );

  return (
    <div className="w-full p-3 sm:p-4">
      <div className="flex items-end gap-2 sm:gap-3 w-full">
          {/* Left Actions - Mobile Optimized */}
          <div className="flex items-center gap-1 sm:gap-2">
            {!isDemo && user && (
              <>
                {/* History Button with Badge - Larger Touch Target */}
                <Tooltip content={`Chat History${conversations.length > 0 ? ` (${conversations.length})` : ''}`}>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={onShowChatHistory}
                    className="relative h-10 w-10 sm:h-9 sm:w-9 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors rounded-xl touch-manipulation"
                  >
                    <History className="h-5 w-5 sm:h-4 sm:w-4" />
                  </Button>
                </Tooltip>

                {/* Direct Upload Button with Immediate Dialog */}
                {onDocumentUploaded ? (
                  <DocumentUpload 
                    onDocumentUploaded={onDocumentUploaded}
                    trigger={
                      <Button
                        size="icon"
                        variant="ghost"
                        className="relative h-10 w-10 sm:h-9 sm:w-9 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors rounded-xl touch-manipulation"
                      >
                        <Upload className="h-5 w-5 sm:h-4 sm:w-4" />
                        {!access.hasAccess && uploadedDocuments.length === 0 && premiumIcon}
                      </Button>
                    }
                  />
                ) : (
                  <Tooltip content={`Upload Documents${uploadedDocuments.length > 0 ? ` (${uploadedDocuments.length} uploaded)` : ''}`}>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleUploadClick}
                      className="relative h-10 w-10 sm:h-9 sm:w-9 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors rounded-xl touch-manipulation"
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
          <div className="flex-1 relative min-w-0">
            <Textarea 
              ref={inputRef} 
              placeholder={
                loading 
                  ? (isEscalated ? "Expert is responding..." : "AI is responding...")
                  : isEscalated 
                    ? "Type your message to the cybersecurity expert..."
                    : "What cybersecurity challenge can I help you solve today?"
              }
              value={input} 
              onChange={e => onInputChange(e.target.value)} 
              onKeyDown={onKeyPress} 
              disabled={loading} 
              className="min-h-[48px] max-h-[120px] resize-none border border-border/30 bg-background text-base placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring px-3 sm:px-4 py-3 rounded-xl transition-all touch-manipulation"
            />
          </div>

          {/* Right Actions - Mobile Optimized */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            
            {/* Send/Stop Button - Dynamic based on loading state */}
            {loading && abortController ? (
              <Button 
                size="icon" 
                onClick={onStopGeneration}
                className="h-12 w-12 sm:h-10 sm:w-10 rounded-xl transition-all duration-200 touch-manipulation bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                <Square className="h-5 w-5 sm:h-4 sm:w-4" />
              </Button>
            ) : (
              <Button 
                size="icon" 
                onClick={onSendMessage} 
                disabled={loading || !input.trim()} 
                className={`h-12 w-12 sm:h-10 sm:w-10 rounded-xl transition-all duration-200 touch-manipulation ${
                  loading 
                    ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                    : input.trim() 
                      ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg hover:scale-105' 
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {loading ? (
                  <div className="animate-spin h-5 w-5 sm:h-4 sm:w-4 border-2 border-current border-t-transparent rounded-full" />
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
import { useState } from 'react';
import { Copy, Check, Target, Shield, Crown, UserCheck } from 'lucide-react';
import { renderSafeMarkdown, createSafeHtml } from '@/lib/sanitization';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AiAvatar } from '@/components/ui/ai-avatar';
import { EscalationButton } from './EscalationButton';
import { AnimatedMessage } from '@/components/ui/feedback';
import { MessageRating } from './MessageRating';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  id?: string;
  suggestions?: string[];
  documents?: string[];
  isStreaming?: boolean;
  metadata?: {
    risk_level?: string;
    framework_tags?: string[];
    confidence?: number;
    escalate_recommendation?: boolean;
    escalation_reason?: string;
    next_actions?: string[];
  };
}

interface ChatMessageProps {
  message: Message;
  conversationId?: string;
  isLatest: boolean;
  isDemo: boolean;
  user: { id: string; email?: string } | null;
  messages: Message[];
  onCopyMessage: (content: string) => void;
  onMessageReaction: (messageId: string, reaction: 'up' | 'down') => void;
  onSuggestionClick: (suggestion: string) => void;
}

export const ChatMessage = ({
  message,
  conversationId,
  isLatest,
  isDemo,
  user,
  messages,
  onCopyMessage,
  onMessageReaction,
  onSuggestionClick,
}: ChatMessageProps) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      onCopyMessage(content);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
      onCopyMessage(content);
    }
  };

  // secure markdown rendering (kept)
  const renderMarkdown = (content: string) => renderSafeMarkdown(content);

  if (message.role === 'user') {
    return (
      <AnimatedMessage className="flex flex-row-reverse items-start gap-3 sm:gap-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground sm:h-8 sm:w-8">
          <div className="h-4 w-4 rounded-full bg-current" />
        </div>
        <div className="flex min-w-0 max-w-[85%] flex-col items-end sm:max-w-[70%] lg:max-w-3xl">
          <div className="hover-lift inline-block rounded-2xl bg-primary p-3 text-primary-foreground shadow-sm sm:p-4">
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed sm:text-base">
              {message.content}
            </p>
          </div>
          <p className="mt-2 px-1 text-xs text-muted-foreground">{message.timestamp}</p>
        </div>
      </AnimatedMessage>
    );
  }

  const showActions =
    !message.isStreaming &&
    !!message.content &&
    !!message.id &&
    !String(message.id).startsWith('streaming_');

  return (
    <AnimatedMessage className="flex items-start gap-3 sm:gap-4">
      <div className="shrink-0">
        <AiAvatar />
      </div>

      <div className="min-w-0 max-w-[85%] flex-1 space-y-3 sm:max-w-[70%] sm:space-y-4 lg:max-w-3xl">
        {/* AI Message Bubble */}
        <div className="group relative">
          <div className="hover-lift rounded-2xl border border-border/30 bg-white/60 p-3 shadow-sm transition-all duration-200 sm:p-4 lg:p-6">
            <div className="prose prose-sm max-w-none sm:prose-base prose-headings:mb-2 prose-headings:mt-4 prose-p:mb-2 prose-p:leading-relaxed prose-strong:font-semibold prose-em:italic prose-ol:mb-2 prose-ul:mb-2 prose-li:mb-1">
              {message.isStreaming && !message.content ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="flex gap-1">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-foreground/60"></div>
                    <div className="h-2 w-2 animate-pulse rounded-full bg-foreground/60" style={{ animationDelay: '0.2s' }}></div>
                    <div className="h-2 w-2 animate-pulse rounded-full bg-foreground/60" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                  <span className="text-sm">vCISO is thinking…</span>
                </div>
              ) : (
                <div dangerouslySetInnerHTML={createSafeHtml(message.content, 'markdown')} />
              )}

              {message.isStreaming && message.content && (
                <div className="ml-1 inline-flex items-center gap-1">
                  <div className="h-3 w-1 animate-pulse bg-foreground/50"></div>
                </div>
              )}
            </div>

            {/* Metadata */}
            {message.metadata && (
              <div className="mt-4 space-y-3 border-t border-border/20 pt-4">
                {message.metadata.framework_tags && message.metadata.framework_tags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Frameworks:</span>
                    {message.metadata.framework_tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {message.metadata.risk_level && (
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Risk Level:</span>
                    <Badge
                      variant={
                        message.metadata.risk_level === 'high'
                          ? 'destructive'
                          : message.metadata.risk_level === 'medium'
                            ? 'secondary'
                            : 'default'
                      }
                      className="text-xs"
                    >
                      {message.metadata.risk_level.toUpperCase()}
                    </Badge>
                  </div>
                )}

                {message.metadata.next_actions && message.metadata.next_actions.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-muted-foreground">Recommended Next Steps:</span>
                    <ul className="ml-4 space-y-1 text-sm">
                      {message.metadata.next_actions.map((action, idx) => (
                        <li key={idx} className="list-disc text-muted-foreground">
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Bar — show ONLY after stream finished and id is real */}
          {showActions && (
            <div className="mt-3 flex items-center justify-between transition-opacity duration-200 sm:mt-4">
              <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleCopyMessage(message.content)}
                  className={cn(
                    'h-7 w-7 p-0 transition-colors hover:bg-muted',
                    isCopied ? 'text-muted-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>

                {message.id && conversationId && (
                  <MessageRating messageId={message.id} conversationId={conversationId} />
                )}

                {!isDemo && user && (
                  <TooltipProvider delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="relative h-8 w-8 transition-all duration-200 hover:scale-105">
                          <div className="absolute inset-0 rounded-md border border-amber-200/50 hover:border-amber-300 dark:border-amber-800/50 dark:hover:border-amber-600 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 hover:bg-gradient-to-r hover:from-amber-100 hover:to-orange-100 dark:hover:from-amber-900/20 dark:hover:to-orange-900/20 hover:text-amber-800 dark:hover:text-amber-400"></div>
                          <div className="absolute inset-0 opacity-0">
                            <EscalationButton
                              messages={messages.map((msg) => ({
                                role: msg.role,
                                content: msg.content,
                                timestamp: msg.timestamp,
                                id: msg.id,
                              }))}
                              variant="inline"
                            />
                          </div>
                          <UserCheck className="pointer-events-none absolute inset-0 m-auto h-4 w-4 text-amber-800 dark:text-amber-400" />
                          <Crown className="pointer-events-none absolute -top-1 -right-1 h-3 w-3 animate-pulse text-amber-600 dark:text-amber-400" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-center">
                          <p className="font-medium">Talk to Security Expert</p>
                          <p className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                            <Crown className="h-3 w-3" />
                            Premium Feature
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          )}

          {/* Suggestions — only once stream is fully done */}
          {message.role === 'assistant' &&
            isLatest &&
            message.suggestions &&
            !messages.some((m) => m.isStreaming) && (
              <div className="space-y-2 sm:space-y-2">
                <div className="flex flex-wrap gap-2">
                  {message.suggestions.map((suggestion, idx) => (
                    <Button
                      key={`suggestion-${idx}`}
                      variant="outline"
                      size="sm"
                      onClick={() => onSuggestionClick(suggestion)}
                      className="text-sm"
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            )}
        </div>

        <p className="text-xs text-muted-foreground">{message.timestamp}</p>
      </div>
    </AnimatedMessage>
  );
};

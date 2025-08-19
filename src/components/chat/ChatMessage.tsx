import { useState } from 'react';
import { Copy, ThumbsUp, ThumbsDown, FileText, Lock, AlertTriangle, Shield, Target } from 'lucide-react';
import { renderSafeMarkdown, createSafeHtml } from '@/lib/sanitization';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AiAvatar } from '@/components/ui/ai-avatar';
import { EscalationButton } from './EscalationButton';
import { PersistentEscalationCTA } from './PersistentEscalationCTA';
import { AnimatedMessage } from '@/components/ui/feedback';
import { MessageRating } from './MessageRating';
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
  user: any;
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
  onSuggestionClick
}: ChatMessageProps) => {
  const [showActions, setShowActions] = useState(false);

  // Use secure markdown rendering
  const renderMarkdown = (content: string) => {
    return renderSafeMarkdown(content);
  };
  if (message.role === 'user') {
    return <AnimatedMessage className="flex gap-3 sm:gap-4 flex-row-reverse items-start">
        <div className="w-8 h-8 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 bg-primary text-primary-foreground">
          <div className="h-4 w-4 rounded-full bg-current" />
        </div>
        <div className="flex flex-col items-end max-w-[85%] sm:max-w-[70%] lg:max-w-3xl min-w-0">
          <div className="inline-block p-3 sm:p-4 rounded-2xl bg-primary text-primary-foreground shadow-sm hover-lift">
            <p className="whitespace-pre-wrap leading-relaxed text-sm sm:text-base break-words">{message.content}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-2 px-1">
            {message.timestamp}
          </p>
        </div>
      </AnimatedMessage>;
  }
  return <AnimatedMessage className="flex gap-3 sm:gap-4 items-start">
      <div className="shrink-0">
        <AiAvatar />
      </div>
      <div className="flex-1 space-y-3 sm:space-y-4 max-w-[85%] sm:max-w-[70%] lg:max-w-3xl min-w-0">
        {/* AI Message Bubble */}
        <div className="group relative" onMouseEnter={() => setShowActions(true)} onMouseLeave={() => setShowActions(false)}>
          <div className="bg-muted/30 border border-border/30 rounded-2xl p-3 sm:p-4 lg:p-6 shadow-sm hover-lift transition-all duration-200">
            <div className="prose prose-sm sm:prose-base max-w-none prose-headings:mt-4 prose-headings:mb-2 prose-p:mb-2 prose-p:leading-relaxed prose-ul:mb-2 prose-ol:mb-2 prose-li:mb-1 prose-strong:font-semibold prose-em:italic text-foreground">
              {message.isStreaming && !message.content ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                    <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                  </div>
                  <span className="text-sm">vCISO is thinking...</span>
                </div>
              ) : (
                <div dangerouslySetInnerHTML={createSafeHtml(message.content, 'markdown')} />
              )}
              {message.isStreaming && message.content && (
                <div className="inline-flex items-center gap-1 ml-1">
                  <div className="w-1 h-3 bg-primary animate-pulse"></div>
                </div>
              )}
            </div>
          
          {/* Metadata display for structured responses */}
          {message.metadata && (
            <div className="mt-4 pt-4 border-t border-border/20 space-y-3">
              {/* Framework Tags */}
              {message.metadata.framework_tags && message.metadata.framework_tags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Frameworks:</span>
                  {message.metadata.framework_tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
              
              {/* Risk Level */}
              {message.metadata.risk_level && (
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Risk Level:</span>
                  <Badge 
                    variant={
                      message.metadata.risk_level === 'high' ? 'destructive' :
                      message.metadata.risk_level === 'medium' ? 'secondary' : 'default'
                    } 
                    className="text-xs"
                  >
                    {message.metadata.risk_level.toUpperCase()}
                  </Badge>
                </div>
              )}
              
              
              {/* Next Actions */}
              {message.metadata.next_actions && message.metadata.next_actions.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">Recommended Next Steps:</span>
                  <ul className="text-sm space-y-1 ml-4">
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

          {/* Action Bar - Mobile Optimized */}
          <div className={`mt-3 sm:mt-4 flex items-center justify-between transition-opacity duration-200 ${showActions ? 'opacity-100' : 'opacity-0 sm:opacity-0'}`}>
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              <Button size="sm" variant="ghost" onClick={() => onCopyMessage(message.content)} className="h-8 sm:h-8 px-2 sm:px-3 text-xs text-muted-foreground hover:text-foreground touch-manipulation button-press">
                <Copy className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Copy</span>
              </Button>
              
              {/* New MessageRating component */}
              {message.id && conversationId && <MessageRating messageId={message.id} conversationId={conversationId} />}
            </div>

            {!isDemo && user && <div className="hidden sm:block">
                <EscalationButton messages={messages.map(msg => ({
                  role: msg.role,
                  content: msg.content,
                  timestamp: msg.timestamp,
                  id: msg.id
                }))} variant="inline" />
              </div>}
          </div>

          {/* Mobile-only Escalation Button */}
          {!isDemo && user && <div className="sm:hidden mt-3 pt-3 border-t border-border/20">
              <EscalationButton messages={messages.map(msg => ({
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp,
                id: msg.id
              }))} variant="inline" />
            </div>}
        </div>

        {/* Document Context Card - Removed */}

        {/* Persistent Escalation CTA - Removed */}

        {/* Quick Action Chips - Legacy suggestions only, disabled during loading */}
        {message.role === 'assistant' && isLatest && message.suggestions && !messages.some(m => m.isStreaming) && (
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

        {/* Timestamp */}
        <p className="text-xs text-muted-foreground">
          {message.timestamp}
        </p>
      </div>
    </AnimatedMessage>;
};
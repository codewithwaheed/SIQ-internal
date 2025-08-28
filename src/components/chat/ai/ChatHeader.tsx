import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AiAvatar } from '@/components/ui/ai-avatar';
import { Edit3, Check, X, UserCheck, History } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { EscalationIntakeForm } from '@/components/chat/EscalationIntakeForm';
import type { CurrentConversation } from './types';
import { SidebarTrigger } from '@/components/ui/sidebar';

interface Props {
  isDemo: boolean;
  user: any;
  currentConversation: CurrentConversation | null;
  editingTitle: boolean;
  editTitleValue: string;
  conversations?: any[];
  startEditingTitle: () => void;
  cancelEditingTitle: () => void;
  saveTitle: () => void;
  setEditTitleValue: (v: string) => void;
  onShowChatHistory?: () => void;
}

export function ChatHeader({
  isDemo,
  user,
  currentConversation,
  editingTitle,
  editTitleValue,
  conversations = [],
  startEditingTitle,
  cancelEditingTitle,
  saveTitle,
  setEditTitleValue,
  onShowChatHistory,
}: Props) {
  return (
    /**
     * Must be inside the same scroll container that has overflow-y-auto.
     * Sticky + top + high z-index keeps it fixed like the composer.
     */
    <div className="sticky top-0 z-[60] w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pt-2 sm:pt-3">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-2 py-1.5 sm:px-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {/* Mobile sidebar toggle */}
          <div className="md:hidden">
            <SidebarTrigger />
          </div>

          <div className="hidden shrink-0 sm:block">
            <AiAvatar />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-[13px] font-semibold text-foreground sm:text-sm">
                Virtual CISO
              </h2>

              {currentConversation && (
                <div className="flex min-w-0 items-center gap-1">
                  <span className="select-none text-muted-foreground">•</span>

                  {editingTitle ? (
                    <div className="relative z-[61] flex min-w-0 items-center gap-1">
                      <Input
                        value={editTitleValue}
                        onChange={(e) => setEditTitleValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
                        className="h-7 w-56 min-w-0 truncate bg-background text-xs"
                        placeholder="Conversation title…"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={saveTitle}
                        className="h-6 w-6 p-0"
                        aria-label="Save title"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={cancelEditingTitle}
                        className="h-6 w-6 p-0"
                        aria-label="Cancel edit"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={startEditingTitle}
                      className="group inline-flex min-w-0 items-center gap-1"
                      title="Edit conversation title"
                    >
                      <span className="max-w-[16rem] truncate text-[12px] text-foreground/90 sm:max-w-[20rem]">
                        {currentConversation.title}
                      </span>
                      <Edit3 className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
              {isDemo ? 'Demo Mode' : 'Ready to provide strategic guidance'}
            </p>
          </div>
        </div>

        {!isDemo && user && (
          <div className="flex flex-shrink-0 items-center gap-2">
            {onShowChatHistory && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onShowChatHistory}
                aria-label="View chat history"
                className="group h-8 rounded-lg bg-muted px-3 text-xs text-foreground transition-all hover:bg-black hover:text-white sm:px-3"
              >
                <History className="h-3.5 w-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Chat History</span>
                {conversations.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground group-hover:bg-white/20 group-hover:text-white">
                    {conversations.length}
                  </span>
                )}
              </Button>
            )}

            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Talk to a Cybersecurity Expert"
                  className="h-8 w-8 rounded-lg p-0 text-muted-foreground transition-all hover:bg-black hover:text-white"
                >
                  <UserCheck className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
                <EscalationIntakeForm messages={[]} onSubmit={() => {}} onCancel={() => {}} />
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </div>
  );
}

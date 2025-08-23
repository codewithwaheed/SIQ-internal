import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AiAvatar } from '@/components/ui/ai-avatar';
import { Edit3, Check, X, UserCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { EscalationIntakeForm } from '@/components/chat/EscalationIntakeForm';
import type { CurrentConversation } from './types';

interface Props {
  isDemo: boolean;
  user: any;
  currentConversation: CurrentConversation | null;
  editingTitle: boolean;
  editTitleValue: string;
  startEditingTitle: () => void;
  cancelEditingTitle: () => void;
  saveTitle: () => void;
  setEditTitleValue: (v: string) => void;
}

export function ChatHeader({
  isDemo,
  user,
  currentConversation,
  editingTitle,
  editTitleValue,
  startEditingTitle,
  cancelEditingTitle,
  saveTitle,
  setEditTitleValue,
}: Props) {
  return (
    /**
     * IMPORTANT:
     * - sticky MUST be inside the same scrolling element (the overflow-y-auto container)
     * - give it a z-index and full width so it layers above messages
     * - keep height compact via small paddings / text sizes
     */
    <div className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-2 sm:px-3 py-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="hidden shrink-0 sm:block">
            <AiAvatar />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-[13px] font-semibold text-foreground sm:text-sm">
                Virtual CISO
              </h2>

              {currentConversation && (
                <div className="min-w-0 flex items-center gap-1">
                  <span className="select-none text-muted-foreground">•</span>

                  {editingTitle ? (
                    <div className="min-w-0 flex items-center gap-1">
                      <Input
                        value={editTitleValue}
                        onChange={(e) => setEditTitleValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
                        className="h-7 w-44 min-w-0 text-xs"
                        placeholder="Title…"
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
                      title="Edit title"
                    >
                      <span className="max-w-[14rem] truncate text-[12px] text-foreground/90 sm:max-w-[18rem]">
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
          <div className="flex flex-shrink-0 items-center">
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Talk to a Cybersecurity Expert"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
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

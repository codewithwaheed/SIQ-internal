import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AiAvatar } from '@/components/ui/ai-avatar';
import { Edit3, Check, X, UserCheck } from 'lucide-react';
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
    <div className="sticky top-0 z-40 flex-shrink-0 border-b border-border/50 bg-background/95 p-2 backdrop-blur-sm sm:p-3">
      <div className="mx-auto flex max-w-4xl items-center justify-between">
        <div className="flex min-w-0 flex-1 items-center space-x-3">
          <div className="hidden sm:block">
            <AiAvatar />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-sm font-semibold text-foreground sm:text-base">
                Virtual CISO
              </h2>
              {currentConversation && (
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">•</span>
                  {editingTitle ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={editTitleValue}
                        onChange={(e) => setEditTitleValue(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && saveTitle()}
                        className="h-6 w-32 min-w-0 text-xs"
                        placeholder="Title..."
                      />
                      <Button size="sm" variant="ghost" onClick={saveTitle} className="h-6 w-6 p-0">
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={cancelEditingTitle} className="h-6 w-6 p-0">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="group flex items-center gap-1">
                      <span className="max-w-32 truncate text-xs text-muted-foreground">
                        {currentConversation.title}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={startEditingTitle}
                        className="h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <p className="truncate text-xs text-muted-foreground sm:text-sm">
              {isDemo ? 'Demo Mode' : 'Ready to provide strategic guidance'}
            </p>
          </div>
        </div>

        {!isDemo && user && (
          <div className="flex flex-shrink-0 items-center space-x-1 sm:space-x-2">
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

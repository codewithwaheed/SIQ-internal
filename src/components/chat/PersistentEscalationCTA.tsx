import { useState } from 'react';
import { MessageSquare, Crown, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EscalationButton } from './EscalationButton';
import { UpgradePrompt } from '@/components/ui/feature-gate';
import { useFeatureGating } from '@/hooks/useFeatureGating';
import { cn } from '@/lib/utils';
interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  id?: string;
}
interface PersistentEscalationCTAProps {
  messages: Message[];
  position: 'header' | 'floating' | 'after-message';
  className?: string;
  compact?: boolean;
}
export const PersistentEscalationCTA = ({
  messages,
  position,
  className,
  compact = false,
}: PersistentEscalationCTAProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const { checkFeatureAccess } = useFeatureGating();
  const access = checkFeatureAccess('escalation');

  // Don't show if no messages yet
  if (messages.length === 0 && position !== 'header') return null;
  const baseClasses = 'transition-all duration-200 touch-manipulation';
  if (position === 'header') {
    return <div className={cn('flex items-center', className)}></div>;
  }
  if (position === 'floating') {
    return null;
  }
  if (position === 'after-message') {
    return (
      <div className={cn('mt-3 rounded-lg border border-border/30 bg-muted/30 p-3', className)}>
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <MessageSquare className="h-4 w-4 text-primary" />
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="mb-1 text-sm font-medium">Need More Help?</h4>
            <p className="mb-3 text-xs text-muted-foreground">
              Get personalized guidance from our cybersecurity experts. Available 24/7 for Premium
              subscribers.
            </p>

            <Button
              variant="default"
              size="sm"
              className="relative min-h-[48px] w-full"
              onClick={() => {
                const access = checkFeatureAccess('escalation');
                if (!access.hasAccess) {
                  setShowUpgradePrompt(true);
                } else {
                  // Handle escalation
                  console.log('Escalating to expert...');
                }
              }}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Talk to a Cybersecurity Expert
              <Crown className="ml-2 h-4 w-4 text-yellow-400" />
            </Button>
          </div>
        </div>

        <UpgradePrompt
          open={showUpgradePrompt}
          onOpenChange={setShowUpgradePrompt}
          feature="escalation"
          trigger={<></>}
        />
      </div>
    );
  }
  return null;
};

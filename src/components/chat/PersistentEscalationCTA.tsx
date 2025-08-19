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
  compact = false
}: PersistentEscalationCTAProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const {
    checkFeatureAccess
  } = useFeatureGating();
  const access = checkFeatureAccess('escalation');

  // Don't show if no messages yet
  if (messages.length === 0 && position !== 'header') return null;
  const baseClasses = "transition-all duration-200 touch-manipulation";
  if (position === 'header') {
    return <div className={cn("flex items-center", className)}>
        
      </div>;
  }
  if (position === 'floating') {
    return null;
  }
  if (position === 'after-message') {
    return <div className={cn("mt-3 p-3 bg-muted/30 border border-border/30 rounded-lg", className)}>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <MessageSquare className="h-4 w-4 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm mb-1">Need More Help?</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Get personalized guidance from our cybersecurity experts. Available 24/7 for Premium subscribers.
            </p>
            
            <Button 
              variant="default" 
              size="sm" 
              className="w-full min-h-[48px] relative" 
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
              <MessageSquare className="h-4 w-4 mr-2" />
              Talk to a Cybersecurity Expert
              <Crown className="h-4 w-4 ml-2 text-yellow-400" />
            </Button>
          </div>
        </div>
        
        <UpgradePrompt 
          open={showUpgradePrompt}
          onOpenChange={setShowUpgradePrompt}
          feature="escalation"
          trigger={<></>}
        />
      </div>;
  }
  return null;
};
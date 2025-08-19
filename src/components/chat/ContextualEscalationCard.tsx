import { useState, useEffect } from 'react';
import { MessageSquare, Crown, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { EscalationIntakeForm } from './EscalationIntakeForm';
import { UpgradePrompt } from '@/components/ui/feature-gate';
import { useFeatureGating } from '@/hooks/useFeatureGating';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  id?: string;
}

interface ContextualEscalationCardProps {
  messages: Message[];
  rationale?: string;
  className?: string;
  onClose?: () => void;
}

// Risk/complexity triggers
const detectRiskTriggers = (content: string): string | null => {
  const riskPatterns = [
    { keywords: ['breach', 'attack', 'compromised', 'incident'], rationale: 'Security incident detected - expert response needed' },
    { keywords: ['compliance', 'audit', 'regulation', 'gdpr', 'hipaa'], rationale: 'Compliance matter requires specialized expertise' },
    { keywords: ['complex', 'enterprise', 'multiple', 'various'], rationale: 'Complex requirements need expert guidance' },
    { keywords: ['urgent', 'emergency', 'critical', 'asap'], rationale: 'Urgent matter requires immediate expert attention' },
    { keywords: ['not sure', 'confused', 'help', 'don\'t understand'], rationale: 'Expert clarification can provide better guidance' }
  ];

  for (const pattern of riskPatterns) {
    if (pattern.keywords.some(keyword => content.toLowerCase().includes(keyword))) {
      return pattern.rationale;
    }
  }
  return null;
};

export const ContextualEscalationCard = ({
  messages,
  rationale,
  className,
  onClose
}: ContextualEscalationCardProps) => {
  const [open, setOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const { checkFeatureAccess } = useFeatureGating();

  const access = checkFeatureAccess('escalation');

  // Scroll into view when component mounts
  useEffect(() => {
    const element = document.getElementById('escalation-card');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, []);

  const handleButtonClick = () => {
    if (!access.hasAccess) {
      setUpgradeOpen(true);
    } else {
      setOpen(true);
    }
  };

  const handleEscalationSubmit = () => {
    setOpen(false);
    onClose?.();
  };

  const displayRationale = rationale || 'Expert guidance can help resolve complex cybersecurity challenges';
  const truncatedRationale = displayRationale.length > 120 
    ? displayRationale.substring(0, 117) + '...' 
    : displayRationale;

  return (
    <>
      <Card 
        id="escalation-card"
        className={cn(
          "mt-4 border-accent/20 bg-accent/5 transition-all duration-200 hover:border-accent/30",
          className
        )}
      >
        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <h4 className="font-medium text-foreground text-sm">
              Talk to a Cybersecurity Expert
            </h4>
            {onClose && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClose}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              >
                ×
              </Button>
            )}
          </div>

          {/* Rationale */}
          <p className="text-xs text-muted-foreground leading-relaxed">
            {truncatedRationale}
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={handleButtonClick}
                  className={cn(
                    "relative min-h-[48px] w-full sm:w-auto",
                    "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Talk to a Cybersecurity Expert
                  {!access.hasAccess && (
                    <Crown className="w-3 h-3 absolute -top-1 -right-1 text-yellow-400" />
                  )}
                </Button>
              </DialogTrigger>
              
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <EscalationIntakeForm 
                  messages={messages} 
                  onSubmit={handleEscalationSubmit} 
                  onCancel={() => setOpen(false)} 
                />
              </DialogContent>
            </Dialog>

            <div className="flex items-center justify-between sm:flex-col sm:items-end text-xs text-muted-foreground">
              <button 
                className="flex items-center gap-1 hover:text-foreground transition-colors"
                onClick={() => {/* TODO: Add help modal */}}
              >
                <HelpCircle className="h-3 w-3" />
                What happens next?
              </button>
              <span className="sm:mt-1">First response in ~2 hours</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <UpgradePrompt 
        feature="escalation" 
        open={upgradeOpen} 
        onOpenChange={setUpgradeOpen} 
        trigger={<></>} 
      />
    </>
  );
};

// Hook to determine if escalation card should be shown
export const useEscalationTrigger = (
  messages: Message[], 
  lastAssistantReplyCount: number
): { shouldShow: boolean; rationale: string | null } => {
  const lastAssistantMessage = messages.filter(m => m.role === 'assistant').pop();
  
  if (!lastAssistantMessage) {
    return { shouldShow: false, rationale: null };
  }

  // Only show every 3 assistant replies
  const assistantMessageCount = messages.filter(m => m.role === 'assistant').length;
  if (assistantMessageCount <= lastAssistantReplyCount + 3) {
    return { shouldShow: false, rationale: null };
  }

  const rationale = detectRiskTriggers(lastAssistantMessage.content);
  return { shouldShow: !!rationale, rationale };
};
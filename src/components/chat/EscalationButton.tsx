import { useMemo, useState } from 'react';
import { MessageSquare, Crown, Clock, User, Loader2, Check, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { EscalationIntakeForm } from './EscalationIntakeForm';
import { UpgradePrompt, UsageIndicator } from '@/components/ui/feature-gate';
import { useFeatureGating } from '@/hooks/useFeatureGating';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  id?: string;
}

type Variant = 'floating' | 'inline-icon';

interface Props {
  messages: ChatMsg[];
  conversationId?: string;
  /** floating = big CTA, inline-icon = the small square icon (same visual as before) */
  variant?: Variant;
  onEscalated?: (data: any) => void;
  isEscalated?: boolean;
  className?: string;
  ariaLabel?: string;
  /** show usage meter (auto off for inline-icon) */
  showUsageIndicator?: boolean;
}

export const EscalationButton = ({
  messages,
  conversationId,
  variant = 'floating',
  onEscalated,
  isEscalated = false,
  className,
  ariaLabel = 'Talk to Security Expert',
  showUsageIndicator,
}: Props) => {
  const [openForm, setOpenForm] = useState(false);
  const [openUpgrade, setOpenUpgrade] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [escalatedInfo, setEscalatedInfo] = useState<any>(null);

  const { toast } = useToast();
  const { checkFeatureAccess } = useFeatureGating();
  const access = checkFeatureAccess('escalation');

  const showUsage = useMemo(
    () =>
      typeof showUsageIndicator === 'boolean' ? showUsageIndicator : variant !== 'inline-icon',
    [showUsageIndicator, variant],
  );

  const handleDirectEscalation = async () => {
    if (!conversationId) {
      setOpenForm(true);
      return;
    }
    setEscalating(true);
    try {
      const { data, error } = await supabase.functions.invoke('conversation-escalate', {
        body: { conversationId, reason: 'User requested human assistance', priority: 'normal' },
      });
      if (error) throw error;
      setEscalatedInfo(data);
      onEscalated?.(data);
      toast({ title: 'Escalated successfully', description: data?.message || 'Sent to expert.' });
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Escalation failed',
        description: err?.message || 'Could not escalate conversation',
        variant: 'destructive',
      });
    } finally {
      setEscalating(false);
    }
  };

  const onClick = () => {
    if (isEscalated || escalating) return;
    if (!access.hasAccess) {
      setOpenUpgrade(true);
      return;
    }
    handleDirectEscalation();
  };

  // escalated state
  if (isEscalated || escalatedInfo) {
    if (variant === 'inline-icon') {
      return (
        <button
          type="button"
          aria-label="Connected to expert"
          title="Connected to expert"
          className={cn(
            'relative h-8 w-8 cursor-default rounded-md',
            'border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50',
            'dark:border-green-800 dark:from-green-950/30 dark:to-emerald-950/30',
            className,
          )}
          disabled
        >
          <Check className="pointer-events-none absolute inset-0 m-auto h-4 w-4 text-green-700 dark:text-green-300" />
        </button>
      );
    }
    return (
      <div className="space-y-2">
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <User className="h-4 w-4" />
            <span className="font-medium">Connected to Expert</span>
          </div>
          {escalatedInfo?.message && (
            <p className="mt-1 text-sm text-green-600 dark:text-green-400">
              {escalatedInfo.message}
            </p>
          )}
          {escalatedInfo?.estimatedWaitTime && (
            <div className="mt-1 flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <Clock className="h-3 w-3" />
              <span>Est. response time: {escalatedInfo.estimatedWaitTime}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'inline-icon') {
    // *** SAME ICON LOOK & HOVER as before, but as a single button (no invisible overlay) ***
    return (
      <>
        <button
          type="button"
          onClick={onClick}
          aria-label={ariaLabel}
          title={ariaLabel}
          className={cn(
            'relative h-8 w-8 rounded-md transition-all duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40',
            className,
          )}
        >
          {/* background tile */}
          <div
            className={cn(
              'absolute inset-0 rounded-md border bg-gradient-to-br',
              'border-amber-200/50 from-amber-50 to-orange-50',
              'hover:border-amber-300 hover:bg-gradient-to-r hover:from-amber-100 hover:to-orange-100',
              'dark:border-amber-800/50 dark:from-amber-950/30 dark:to-orange-950/30',
              'dark:hover:border-amber-600 dark:hover:from-amber-900/20 dark:hover:to-orange-900/20',
            )}
          />
          {/* center icon (matches old) */}
          {escalating ? (
            <Loader2 className="pointer-events-none absolute inset-0 m-auto h-4 w-4 animate-spin text-amber-800 dark:text-amber-400" />
          ) : (
            <UserCheck className="pointer-events-none absolute inset-0 m-auto h-4 w-4 text-amber-800 dark:text-amber-400" />
          )}
          {/* crown badge (matches old) */}
          {!access.hasAccess && (
            <Crown className="pointer-events-none absolute -right-1 -top-1 h-3 w-3 animate-pulse text-amber-600 dark:text-amber-400" />
          )}
        </button>

        {/* Intake form (for no conversation or if you later want details) */}
        <Dialog open={openForm} onOpenChange={setOpenForm}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
            <EscalationIntakeForm
              messages={messages}
              onSubmit={() => setOpenForm(false)}
              onCancel={() => setOpenForm(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Upgrade prompt if gated */}
        <UpgradePrompt
          feature="escalation"
          open={openUpgrade}
          onOpenChange={setOpenUpgrade}
          trigger={<></>}
        />
      </>
    );
  }

  // large CTA (unchanged behavior)
  return (
    <div className="space-y-2">
      {showUsage && <UsageIndicator feature="escalation" />}
      <Button
        type="button"
        onClick={onClick}
        disabled={escalating}
        variant="outline"
        size="sm"
        className={cn('relative min-h-[48px] w-full', escalating && 'cursor-wait opacity-90')}
      >
        {escalating ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <MessageSquare className="mr-2 h-4 w-4" />
        )}
        {escalating ? 'Connecting…' : 'Talk to a Cybersecurity Expert'}
        {!access.hasAccess && (
          <Crown className="absolute -right-1 -top-1 h-3 w-3 text-purple-500" />
        )}
      </Button>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
          <EscalationIntakeForm
            messages={messages}
            onSubmit={() => setOpenForm(false)}
            onCancel={() => setOpenForm(false)}
          />
        </DialogContent>
      </Dialog>

      <UpgradePrompt
        feature="escalation"
        open={openUpgrade}
        onOpenChange={setOpenUpgrade}
        trigger={<></>}
      />
    </div>
  );
};

export default EscalationButton;

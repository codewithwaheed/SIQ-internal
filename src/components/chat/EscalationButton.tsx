import { useState } from "react";
import { MessageSquare, Crown, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { EscalationIntakeForm } from "./EscalationIntakeForm";
import { UpgradePrompt, UsageIndicator } from "@/components/ui/feature-gate";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  id?: string;
}

interface EscalationButtonProps {
  messages: Message[];
  conversationId?: string;
  variant?: "inline" | "floating";
  onEscalated?: (escalationData: any) => void;
  isEscalated?: boolean;
}

export const EscalationButton = ({
  messages,
  conversationId,
  variant = "floating",
  onEscalated,
  isEscalated = false,
}: EscalationButtonProps) => {
  const [open, setOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [escalatedInfo, setEscalatedInfo] = useState<any>(null);
  const { toast } = useToast();

  const { checkFeatureAccess } = useFeatureGating();

  const handleDirectEscalation = async () => {
    if (!conversationId) {
      toast({
        title: "Error",
        description: "No active conversation to escalate",
        variant: "destructive",
      });
      return;
    }

    setEscalating(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        "conversation-escalate",
        {
          body: {
            conversationId,
            reason: "User requested human assistance",
            priority: "normal",
          },
        },
      );

      if (error) throw error;

      setEscalatedInfo(data);
      onEscalated?.(data);

      toast({
        title: "Escalated Successfully",
        description: data.message,
      });
    } catch (error: any) {
      console.error("Escalation error:", error);
      toast({
        title: "Escalation Failed",
        description: error.message || "Failed to escalate conversation",
        variant: "destructive",
      });
    } finally {
      setEscalating(false);
    }
  };

  const handleButtonClick = () => {
    // Prevent multiple escalations
    if (isEscalated || escalating) return;

    const access = checkFeatureAccess("escalation");
    if (!access.hasAccess) {
      setUpgradeOpen(true);
    } else if (conversationId) {
      // Direct escalation for active conversations
      handleDirectEscalation();
    } else {
      // Full form for new escalations
      setOpen(true);
    }
  };

  const handleEscalationSubmit = () => {
    setOpen(false);
  };

  // Show escalated state if already escalated
  if (isEscalated || escalatedInfo) {
    return (
      <div className="space-y-2">
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <User className="h-4 w-4" />
            <span className="font-medium">Connected to Expert</span>
          </div>
          <p className="text-sm text-green-600 dark:text-green-400 mt-1">
            {escalatedInfo.message}
          </p>
          {escalatedInfo.estimatedWaitTime && (
            <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mt-1">
              <Clock className="h-3 w-3" />
              <span>Est. response time: {escalatedInfo.estimatedWaitTime}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  const buttonContent = (
    <>
      <MessageSquare className="h-4 w-4 mr-2" />
      {escalating ? "Connecting..." : "Talk to a Cybersecurity Expert"}
    </>
  );

  const access = checkFeatureAccess("escalation");
  const premiumIcon = (
    <Crown className="w-3 h-3 absolute -top-1 -right-1 text-purple-500" />
  );

  return (
    <div className="space-y-2">
      {/* Usage Indicator */}
      <UsageIndicator feature="escalation" />

      <div className="relative">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={handleButtonClick}
              disabled={escalating || isEscalated}
              variant={variant === "inline" ? "default" : "outline"}
              size="sm"
              className={cn(
                "relative w-full min-h-[48px]",
                variant === "inline" &&
                  "bg-primary text-primary-foreground hover:bg-primary/90",
                (isEscalated || escalating) && "opacity-50 cursor-not-allowed",
              )}
            >
              {buttonContent}
              {!access.hasAccess && premiumIcon}
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
      </div>

      <UpgradePrompt
        feature="escalation"
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        trigger={<></>}
      />
    </div>
  );
};

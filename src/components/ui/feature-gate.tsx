import React, { ReactNode } from "react";
import { Lock, Crown, Zap, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useFeatureGating, FeatureKey } from "@/hooks/useFeatureGating";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { UpgradeSelection } from "@/components/ui/upgrade-selection";

interface FeatureGateProps {
  feature: FeatureKey;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
  className?: string;
}

interface RestrictedButtonProps {
  feature: FeatureKey;
  children: ReactNode;
  onClick?: () => void;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  disabled?: boolean;
  showTooltip?: boolean;
}

interface UpgradePromptProps {
  feature: FeatureKey;
  trigger: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function FeatureGate({
  feature,
  children,
  fallback,
  showUpgradePrompt = false,
  className,
}: FeatureGateProps) {
  const { checkFeatureAccess } = useFeatureGating();
  const access = checkFeatureAccess(feature);

  if (access.hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showUpgradePrompt) {
    return <UpgradePrompt feature={feature} trigger={children} />;
  }

  // Hide the feature completely if no access and no fallback
  return null;
}

export const RestrictedButton = React.forwardRef<
  HTMLButtonElement,
  RestrictedButtonProps
>(
  (
    {
      feature,
      children,
      onClick,
      variant = "default",
      size = "default",
      className,
      disabled = false,
      showTooltip = true,
      ...props
    },
    ref,
  ) => {
    const { checkFeatureAccess, getFeatureConfig } = useFeatureGating();
    const access = checkFeatureAccess(feature);
    const config = getFeatureConfig(feature);

    if (access.hasAccess) {
      return (
        <Button
          ref={ref}
          variant={variant}
          size={size}
          onClick={onClick}
          disabled={disabled}
          className={className}
          {...props}
        >
          {children}
        </Button>
      );
    }

    return (
      <UpgradePrompt
        feature={feature}
        trigger={
          <Button
            ref={ref}
            variant="outline"
            size={size}
            className={cn("relative opacity-60 cursor-not-allowed", className)}
            disabled={true}
            {...props}
          >
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              {children}
            </div>
            {config.requiredTier === "Pro" && (
              <Crown className="w-3 h-3 absolute -top-1 -right-1 text-blue-500" />
            )}
            {config.requiredTier === "Premium" && (
              <Zap className="w-3 h-3 absolute -top-1 -right-1 text-purple-500" />
            )}
          </Button>
        }
      />
    );
  },
);

RestrictedButton.displayName = "RestrictedButton";

export function UpgradePrompt({
  feature,
  trigger,
  open,
  onOpenChange,
}: UpgradePromptProps) {
  const { checkFeatureAccess, getFeatureConfig, getUpgradeUrl, currentTier } =
    useFeatureGating();
  const navigate = useNavigate();
  const access = checkFeatureAccess(feature);
  const config = getFeatureConfig(feature);
  const [showUpgradeSelection, setShowUpgradeSelection] = React.useState(false);

  const handleUpgrade = () => {
    setShowUpgradeSelection(true);
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case "Pro":
        return <Crown className="w-5 h-5 text-blue-500" />;
      case "Premium":
        return <Zap className="w-5 h-5 text-purple-500" />;
      default:
        return <Lock className="w-5 h-5" />;
    }
  };

  const getTierBadgeVariant = (
    tier: string,
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (tier) {
      case "Pro":
        return "default";
      case "Premium":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getFeatureBenefits = (feature: FeatureKey, tier: string) => {
    const baseBenefits = [
      "Priority customer support",
      "Advanced security features",
      "Enhanced AI capabilities",
    ];

    const featureSpecific: Record<FeatureKey, string[]> = {
      document_upload: [
        "Upload unlimited documents",
        "Advanced document analysis",
        "Document version tracking",
        "AI-powered content extraction",
      ],
      escalation: [
        "Connect with cybersecurity experts",
        "24/7 expert availability",
        "Priority response times",
        "Detailed solution documentation",
      ],
      live_consultation: [
        "Schedule live video calls",
        "Screen sharing capabilities",
        "Session recordings",
        "1-on-1 expert guidance",
      ],
      compliance_review: [
        "Comprehensive compliance audits",
        "Industry-specific assessments",
        "Detailed remediation plans",
        "Quarterly review reports",
      ],
      export_policies: [
        "Export in multiple formats",
        "Custom branding options",
        "Template customization",
        "Version control tracking",
      ],
      custom_templates: [
        "Create custom policy templates",
        "Team template sharing",
        "Template version management",
        "Industry-specific templates",
      ],
      unlimited_documents: [
        "No monthly upload limits",
        "Bulk document processing",
        "Advanced search capabilities",
        "Document relationship mapping",
      ],
      priority_support: [
        "Skip the queue support",
        "Dedicated account manager",
        "Phone support access",
        "Same-day response guarantee",
      ],
      consultant_reviews: [
        "Expert document reviews",
        "Actionable recommendations",
        "Implementation guidance",
        "Follow-up consultations",
      ],
      advanced_ai: [
        "Enhanced context memory",
        "Multi-document analysis",
        "Intelligent recommendations",
        "Predictive compliance insights",
      ],
    };

    return [...(featureSpecific[feature] || []), ...baseBenefits].slice(0, 4);
  };

  const getPricingContext = (tier: string) => {
    // Use the actual pricing data from the subscription components
    switch (tier) {
      case "Pro":
        return {
          price: "$49",
          period: "month",
          savings: "Upload documents + 1 expert escalation",
        };
      case "Premium":
        return {
          price: "$149",
          period: "month",
          savings: "Unlimited uploads + 2 live consultations",
        };
      default:
        return {
          price: "$0",
          period: "month",
          savings: "AI-powered cybersecurity guidance",
        };
    }
  };

  const pricing = getPricingContext(config.requiredTier);
  const benefits = getFeatureBenefits(feature, config.requiredTier);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg animate-scale-in">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20">
            {getTierIcon(config.requiredTier)}
          </div>
          <DialogTitle className="text-2xl font-bold">
            Unlock {config.name}
          </DialogTitle>
          <DialogDescription className="text-base">
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Plan Status */}
          <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium">
                Current: {currentTier} Plan
              </span>
            </div>
            <Badge variant="outline" className="text-xs">
              {access.reason}
            </Badge>
          </div>

          {/* Feature Benefits */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-center">
              With {config.requiredTier}, you'll get:
            </h4>
            <div className="grid gap-2">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-3 text-sm">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                    <div className="h-2 w-2 rounded-full bg-green-600" />
                  </div>
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing */}
          <div className="text-center space-y-2">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-3xl font-bold">{pricing.price}</span>
              <span className="text-muted-foreground">/{pricing.period}</span>
            </div>
            <p className="text-sm text-green-600 font-medium">
              {pricing.savings}
            </p>
          </div>

          {/* CTA Buttons */}
          <DialogFooter className="flex-col gap-3 sm:flex-col">
            <Button
              onClick={handleUpgrade}
              className="w-full h-11 text-base font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 animate-fade-in"
              size="lg"
            >
              <span className="flex items-center gap-2">
                {getTierIcon(config.requiredTier)}
                Upgrade to {config.requiredTier} Now
              </span>
            </Button>
            <Button
              variant="ghost"
              onClick={() => onOpenChange?.(false)}
              className="w-full text-muted-foreground hover:text-foreground"
            >
              Maybe Later
            </Button>
          </DialogFooter>

          {/* Trust indicators */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              ✓ 30-day money-back guarantee • ✓ Cancel anytime • ✓ Secure
              billing
            </p>
          </div>
        </div>

        <UpgradeSelection
          open={showUpgradeSelection}
          onOpenChange={setShowUpgradeSelection}
        />
      </DialogContent>
    </Dialog>
  );
}

// Inline upgrade nudge for subtle prompting
export function InlineUpgradeNudge({
  feature,
  className,
}: {
  feature: FeatureKey;
  className?: string;
}) {
  const { checkFeatureAccess, getFeatureConfig, getUpgradeUrl } =
    useFeatureGating();
  const navigate = useNavigate();
  const access = checkFeatureAccess(feature);
  const config = getFeatureConfig(feature);

  if (access.hasAccess) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Lock className="w-4 h-4 text-amber-600" />
        <div>
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            {config.name} - {config.requiredTier} Feature
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {config.description}
          </p>
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => navigate(getUpgradeUrl(config.requiredTier))}
        className="border-amber-200 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/20"
      >
        Upgrade
      </Button>
    </div>
  );
}

// Usage indicator component for showing remaining usage
export function UsageIndicator({ feature }: { feature: FeatureKey }) {
  const { checkFeatureAccess, getFeatureConfig } = useFeatureGating();
  const access = checkFeatureAccess(feature);
  const config = getFeatureConfig(feature);

  if (!access.hasAccess || !access.totalLimit || access.totalLimit === -1) {
    return null;
  }

  const usagePercentage =
    ((access.totalLimit - (access.remainingUsage || 0)) / access.totalLimit) *
    100;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{config.name} Usage</span>
        <span className="font-medium">
          {access.totalLimit - (access.remainingUsage || 0)}/{access.totalLimit}
        </span>
      </div>
      <div className="w-full bg-muted rounded-full h-1.5">
        <div
          className={cn(
            "h-1.5 rounded-full transition-all",
            usagePercentage >= 100
              ? "bg-red-500"
              : usagePercentage >= 80
                ? "bg-yellow-500"
                : "bg-green-500",
          )}
          style={{ width: `${Math.min(usagePercentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

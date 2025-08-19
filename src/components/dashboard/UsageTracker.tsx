import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { FileText, MessageSquare, RefreshCw, TrendingUp, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface UsageData {
  subscription: {
    subscribed: boolean;
    tier: string;
    subscription_end: string | null;
    billing_cycle_start: string;
  };
  usage: {
    uploads: {
      used: number;
      limit: number;
      remaining: number;
      can_upload: boolean;
    };
    escalations: {
      used: number;
      limit: number;
      remaining: number;
      can_escalate: boolean;
    };
  };
  tier_features: {
    basic: {
      ai_chat: boolean;
      document_upload: boolean;
      consultant_escalation: boolean;
    };
    pro: {
      ai_chat: boolean;
      document_upload: boolean;
      upload_limit: number;
      consultant_escalation: boolean;
    };
    premium: {
      ai_chat: boolean;
      document_upload: boolean;
      upload_limit: number;
      consultant_escalation: boolean;
      escalation_limit: number;
    };
  };
}

interface UsageTrackerProps {
  variant?: 'card' | 'sidebar' | 'compact';
  className?: string;
}

export function UsageTracker({ variant = 'card', className = '' }: UsageTrackerProps) {
  const { user, session } = useAuth();
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsageData = async () => {
    if (!user || !session) return;

    try {
      setRefreshing(true);
      const { data, error } = await supabase.functions.invoke('check-usage', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      setUsageData(data);
    } catch (error: any) {
      console.error('Error fetching usage data:', error);
      toast.error('Failed to load usage data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleUpgrade = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout');
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error('Failed to start upgrade process');
    }
  };

  useEffect(() => {
    fetchUsageData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchUsageData, 30000);
    return () => clearInterval(interval);
  }, [user, session]);

  // Helper functions
  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0; // Show as empty for unlimited
    return Math.min((used / limit) * 100, 100);
  };

  const formatUsage = (used: number, limit: number) => {
    if (limit === -1) return `${used} used (unlimited)`;
    return `${used} / ${limit} used`;
  };

  const isApproachingLimit = (used: number, limit: number) => limit !== -1 && used / limit >= 0.8;

  const isAtLimit = (used: number, limit: number) => limit !== -1 && used >= limit;

  const shouldShowUpgrade = () => {
    if (!usageData) return false;
    const { usage } = usageData;
    return (
      isApproachingLimit(usage.uploads.used, usage.uploads.limit) ||
      isApproachingLimit(usage.escalations.used, usage.escalations.limit) ||
      isAtLimit(usage.uploads.used, usage.uploads.limit) ||
      isAtLimit(usage.escalations.used, usage.escalations.limit)
    );
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-24 rounded-lg bg-muted"></div>
      </div>
    );
  }

  if (!user || !usageData) {
    return null;
  }

  const { subscription, usage } = usageData;

  // Compact variant for tight spaces
  if (variant === 'compact') {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Plan Usage</span>
          <Badge variant="outline" className="text-xs">
            {subscription.tier}
          </Badge>
        </div>

        {usage.uploads.limit > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span>Uploads</span>
              <span
                className={
                  isAtLimit(usage.uploads.used, usage.uploads.limit) ? 'text-destructive' : ''
                }
              >
                {usage.uploads.used}/{usage.uploads.limit === -1 ? '∞' : usage.uploads.limit}
              </span>
            </div>
            <Progress
              value={getUsagePercentage(usage.uploads.used, usage.uploads.limit)}
              className="h-1"
            />
          </div>
        )}

        {usage.escalations.limit > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span>Escalations</span>
              <span
                className={
                  isAtLimit(usage.escalations.used, usage.escalations.limit)
                    ? 'text-destructive'
                    : ''
                }
              >
                {usage.escalations.used}/
                {usage.escalations.limit === -1 ? '∞' : usage.escalations.limit}
              </span>
            </div>
            <Progress
              value={getUsagePercentage(usage.escalations.used, usage.escalations.limit)}
              className="h-1"
            />
          </div>
        )}

        {shouldShowUpgrade() && (
          <Button size="sm" className="h-6 w-full text-xs" onClick={handleUpgrade}>
            <TrendingUp className="mr-1 h-3 w-3" />
            Upgrade
          </Button>
        )}
      </div>
    );
  }

  // Sidebar variant for navigation areas
  if (variant === 'sidebar') {
    return (
      <div className={`space-y-3 rounded-lg border border-border/50 bg-muted/20 p-3 ${className}`}>
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Usage This Month</h4>
          <Badge variant="outline" className="text-xs">
            {subscription.tier}
          </Badge>
        </div>

        {usage.uploads.limit > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-3 w-3" />
              <span>Document Uploads</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{formatUsage(usage.uploads.used, usage.uploads.limit)}</span>
              {isAtLimit(usage.uploads.used, usage.uploads.limit) && (
                <span className="font-medium text-destructive">Limit reached</span>
              )}
            </div>
            <Progress
              value={getUsagePercentage(usage.uploads.used, usage.uploads.limit)}
              className="h-2"
            />
          </div>
        )}

        {usage.escalations.limit > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <MessageSquare className="h-3 w-3" />
              <span>Expert Escalations</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{formatUsage(usage.escalations.used, usage.escalations.limit)}</span>
              {isAtLimit(usage.escalations.used, usage.escalations.limit) && (
                <span className="font-medium text-destructive">Limit reached</span>
              )}
            </div>
            <Progress
              value={getUsagePercentage(usage.escalations.used, usage.escalations.limit)}
              className="h-2"
            />
          </div>
        )}

        {shouldShowUpgrade() && (
          <Button size="sm" className="w-full" onClick={handleUpgrade}>
            <Zap className="mr-2 h-4 w-4" />
            Upgrade for More
          </Button>
        )}
      </div>
    );
  }

  // Default card variant
  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Usage Overview</CardTitle>
            <CardDescription>
              Current plan: <Badge variant="secondary">{subscription.tier}</Badge>
            </CardDescription>
          </div>
          <Button onClick={fetchUsageData} variant="outline" size="sm" disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Document Uploads */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="font-medium">Document Uploads</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {formatUsage(usage.uploads.used, usage.uploads.limit)}
              </span>
            </div>
            {usage.uploads.limit > 0 ? (
              <div className="space-y-1">
                <Progress
                  value={getUsagePercentage(usage.uploads.used, usage.uploads.limit)}
                  className="h-2"
                />
                {!usage.uploads.can_upload && usage.uploads.limit !== -1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-red-600">Upload limit reached.</p>
                    <Button size="sm" variant="outline" onClick={handleUpgrade}>
                      Upgrade Plan
                    </Button>
                  </div>
                )}
                {isApproachingLimit(usage.uploads.used, usage.uploads.limit) &&
                  !isAtLimit(usage.uploads.used, usage.uploads.limit) && (
                    <p className="text-sm text-orange-600">
                      Approaching upload limit (
                      {Math.round((usage.uploads.used / usage.uploads.limit) * 100)}% used)
                    </p>
                  )}
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Not available on {subscription.tier} plan
                </p>
                <Button size="sm" variant="outline" onClick={handleUpgrade}>
                  Upgrade to Upload
                </Button>
              </div>
            )}
          </div>

          {/* Consultant Escalations */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span className="font-medium">Consultant Escalations</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {formatUsage(usage.escalations.used, usage.escalations.limit)}
              </span>
            </div>
            {usage.escalations.limit > 0 ? (
              <div className="space-y-1">
                <Progress
                  value={getUsagePercentage(usage.escalations.used, usage.escalations.limit)}
                  className="h-2"
                />
                {!usage.escalations.can_escalate && usage.escalations.limit !== -1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-red-600">Escalation limit reached.</p>
                    <Button size="sm" variant="outline" onClick={handleUpgrade}>
                      Upgrade Plan
                    </Button>
                  </div>
                )}
                {isApproachingLimit(usage.escalations.used, usage.escalations.limit) &&
                  !isAtLimit(usage.escalations.used, usage.escalations.limit) && (
                    <p className="text-sm text-orange-600">
                      Approaching escalation limit (
                      {Math.round((usage.escalations.used / usage.escalations.limit) * 100)}% used)
                    </p>
                  )}
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Not available on {subscription.tier} plan
                </p>
                <Button size="sm" variant="outline" onClick={handleUpgrade}>
                  Upgrade for Escalations
                </Button>
              </div>
            )}
          </div>

          {/* Billing Cycle Info */}
          {subscription.subscription_end && (
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Usage resets on {new Date(subscription.subscription_end).toLocaleDateString()}
              </p>
            </div>
          )}

          {/* Main upgrade CTA for limits hit */}
          {shouldShowUpgrade() && (
            <div className="border-t pt-4">
              <Button className="w-full" onClick={handleUpgrade}>
                <TrendingUp className="mr-2 h-4 w-4" />
                Upgrade Your Plan for More Usage
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

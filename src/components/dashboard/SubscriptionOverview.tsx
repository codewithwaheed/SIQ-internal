import { Crown, Zap, Check, X, ArrowRight, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatureGating } from '@/hooks/useFeatureGating';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export function SubscriptionOverview() {
  const { subscriptionInfo, user, session } = useAuth();
  const { currentTier, getAllFeatureAccess, getUpgradeUrl, FEATURE_CONFIG } = useFeatureGating();
  const navigate = useNavigate();

  const featureAccess = getAllFeatureAccess();

  const handleUpgrade = async () => {
    navigate('/pricing');
  };

  const handleManageSubscription = async () => {
    if (!user || !session?.access_token) return;

    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      // Open Customer Portal in a new tab
      window.open(data.url, '_blank');
    } catch (error: any) {
      console.error('Error opening customer portal:', error);
      toast.error(error.message || 'Failed to open customer portal');
    }
  };

  const getTierBadgeVariant = (tier: string) => {
    switch (tier) {
      case 'Pro':
        return 'default';
      case 'Premium':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'Pro':
        return <Crown className="h-4 w-4" />;
      case 'Premium':
        return <Zap className="h-4 w-4" />;
      default:
        return null;
    }
  };

  // Mock usage data - in a real app, this would come from the backend
  const usageData = {
    uploads: {
      used: 2,
      limit: currentTier === 'Pro' ? 5 : currentTier === 'Premium' ? -1 : 0,
    },
    escalations: {
      used: 0,
      limit: currentTier === 'Pro' ? 1 : currentTier === 'Premium' ? 2 : 0,
    },
  };

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>Current Plan</CardTitle>
              <Badge variant={getTierBadgeVariant(currentTier)} className="flex items-center gap-1">
                {getTierIcon(currentTier)}
                {currentTier}
              </Badge>
            </div>
            {subscriptionInfo?.subscribed && (
              <Button variant="outline" size="sm" onClick={handleManageSubscription}>
                Manage Subscription
              </Button>
            )}
          </div>
          <CardDescription>
            {subscriptionInfo?.subscription_end && (
              <span>
                Subscription active until{' '}
                {new Date(subscriptionInfo.subscription_end).toLocaleDateString()}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Usage Overview */}
            {currentTier !== 'Basic' && (
              <div className="space-y-3">
                <h4 className="font-medium">Usage This Month</h4>

                {/* Document Uploads */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Document Uploads</span>
                    <span className="font-medium">
                      {usageData.uploads.used}/
                      {usageData.uploads.limit === -1 ? '∞' : usageData.uploads.limit}
                    </span>
                  </div>
                  {usageData.uploads.limit !== -1 && (
                    <Progress
                      value={(usageData.uploads.used / usageData.uploads.limit) * 100}
                      className="h-2"
                    />
                  )}
                </div>

                {/* Escalations */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Expert Escalations</span>
                    <span className="font-medium">
                      {usageData.escalations.used}/
                      {usageData.escalations.limit === -1 ? '∞' : usageData.escalations.limit}
                    </span>
                  </div>
                  {usageData.escalations.limit !== -1 && (
                    <Progress
                      value={(usageData.escalations.used / usageData.escalations.limit) * 100}
                      className="h-2"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Upgrade CTA for Basic users */}
            {currentTier === 'Basic' && (
              <div className="rounded-lg border bg-gradient-to-r from-blue-50 to-purple-50 p-4 dark:from-blue-950/20 dark:to-purple-950/20">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 text-blue-600" />
                  <div className="space-y-2">
                    <p className="font-medium text-blue-900 dark:text-blue-100">
                      Unlock Premium Features
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-200">
                      Upload documents, get expert help, and access advanced AI capabilities.
                    </p>
                    <Button size="sm" onClick={handleUpgrade} className="mt-2">
                      Upgrade Now <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Feature Access Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Access</CardTitle>
          <CardDescription>See what features are available on your current plan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(FEATURE_CONFIG).map(([key, config]) => {
              const access = featureAccess[key];
              const hasAccess = access?.hasAccess || false;

              return (
                <div key={key} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    {hasAccess ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <X className="h-4 w-4 text-red-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{config.name}</p>
                      <p className="text-xs text-muted-foreground">{config.description}</p>
                    </div>
                  </div>
                  {!hasAccess && (
                    <Badge variant="outline" className="text-xs">
                      {config.requiredTier}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>

          {/* Upgrade suggestion for lower tiers */}
          {currentTier !== 'Premium' && (
            <>
              <Separator className="my-6" />
              <div className="space-y-3 text-center">
                <p className="text-sm text-muted-foreground">Want access to all features?</p>
                <Button onClick={handleUpgrade} variant="outline">
                  View Pricing Plans <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Billing Information */}
      {subscriptionInfo?.subscribed && (
        <Card>
          <CardHeader>
            <CardTitle>Billing</CardTitle>
            <CardDescription>Manage your billing information and subscription</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Next billing date</span>
                <span className="text-sm font-medium">
                  {subscriptionInfo.subscription_end
                    ? new Date(subscriptionInfo.subscription_end).toLocaleDateString()
                    : 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Plan</span>
                <span className="flex items-center gap-1 text-sm font-medium">
                  {getTierIcon(currentTier)}
                  {currentTier}
                </span>
              </div>
              <Separator />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleManageSubscription}>
                  Manage Billing
                </Button>
                {currentTier !== 'Premium' && (
                  <Button size="sm" onClick={handleUpgrade}>
                    Upgrade Plan
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CreditCard, RefreshCw, Crown, Zap } from 'lucide-react';

export function SubscriptionManager() {
  const { user, session, subscriptionInfo, checkSubscription } = useAuth();

  useEffect(() => {
    if (user && session) {
      checkSubscription();
    }
  }, [user, session]);

  const handleManageSubscription = async () => {
    if (!user || !session) {
      toast.error('Please sign in to manage your subscription');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      // Open Stripe customer portal in a new tab
      window.open(data.url, '_blank');
    } catch (error: any) {
      console.error('Error opening customer portal:', error);
      toast.error(error.message || 'Failed to open customer portal');
    }
  };

  const handleRefreshSubscription = async () => {
    try {
      await checkSubscription();
      toast.success('Subscription status refreshed');
    } catch (error) {
      toast.error('Failed to refresh subscription status');
    }
  };

  if (!subscriptionInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Loading Subscription...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading your subscription information...</p>
        </CardContent>
      </Card>
    );
  }

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'Premium':
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 'Pro':
        return <Zap className="w-5 h-5 text-blue-500" />;
      default:
        return <CreditCard className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Premium':
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
      case 'Pro':
        return 'bg-gradient-to-r from-blue-400 to-blue-600';
      default:
        return 'bg-gradient-to-r from-gray-400 to-gray-600';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getTierIcon(subscriptionInfo.subscription_tier)}
            Subscription Status
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshSubscription}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </CardTitle>
        <CardDescription>
          Manage your SentrIQ subscription and billing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-medium">Current Plan:</span>
          <Badge className={getTierColor(subscriptionInfo.subscription_tier)}>
            {subscriptionInfo.subscription_tier}
          </Badge>
        </div>

        {subscriptionInfo.subscribed && subscriptionInfo.subscription_end && (
          <div className="flex items-center justify-between">
            <span className="font-medium">Next Billing:</span>
            <span className="text-sm text-muted-foreground">
              {new Date(subscriptionInfo.subscription_end).toLocaleDateString()}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="font-medium">Status:</span>
          <Badge variant={subscriptionInfo.subscribed ? "default" : "secondary"}>
            {subscriptionInfo.subscribed ? "Active" : "Free Plan"}
          </Badge>
        </div>

        <div className="pt-4 space-y-2">
          {subscriptionInfo.subscribed ? (
            <Button 
              onClick={handleManageSubscription}
              className="w-full"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Manage Subscription
            </Button>
          ) : (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Upgrade to unlock premium features
              </p>
              <Button 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="w-full"
              >
                View Plans
              </Button>
            </div>
          )}
        </div>

        {/* Feature Limits for Current Plan */}
        <div className="pt-4 border-t">
          <h4 className="font-medium mb-2">Plan Features:</h4>
          <div className="space-y-1 text-sm text-muted-foreground">
            {subscriptionInfo.subscription_tier === 'Basic' && (
              <p>• AI chat assistance</p>
            )}
            {subscriptionInfo.subscription_tier === 'Pro' && (
              <>
                <p>• AI chat assistance</p>
                <p>• Document uploads (5/month)</p>
                <p>• 1 compliance framework</p>
                <p>• Consultant escalation (1/quarter)</p>
              </>
            )}
            {subscriptionInfo.subscription_tier === 'Premium' && (
              <>
                <p>• AI chat assistance</p>
                <p>• Unlimited document uploads</p>
                <p>• All compliance frameworks</p>
                <p>• Consultant escalation (2/month)</p>
                <p>• Priority support</p>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
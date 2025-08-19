import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Calendar, ArrowUpRight, RefreshCw } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function BillingManagement() {
  const { user, session, subscriptionInfo } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleManageSubscription = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to manage your subscription.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;

      // Open customer portal in a new tab
      window.open(data.url, '_blank');
    } catch (error: any) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to open customer portal",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      if (error) throw error;
      toast({
        title: "Success",
        description: "Subscription status refreshed",
      });
      // Refresh the page to update the context
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to refresh subscription status",
        variant: "destructive"
      });
    }
  };

  const getTierIcon = () => {
    switch (subscriptionInfo?.subscription_tier) {
      case 'Pro':
        return '🔵';
      case 'Premium':
        return '🔴';
      default:
        return '⚪';
    }
  };

  const getTierColor = () => {
    switch (subscriptionInfo?.subscription_tier) {
      case 'Pro':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Premium':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getUsageInfo = () => {
    // For now, return null since usage tracking needs to be implemented
    return null;
  };

  const usage = getUsageInfo();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Billing & Subscription</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshSubscription}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{getTierIcon()}</span>
              <div>
                <div className="font-semibold text-lg">
                  {subscriptionInfo?.subscription_tier || 'Basic'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {subscriptionInfo?.subscribed ? 'Active subscription' : 'Free plan'}
                </div>
              </div>
            </div>
            <Badge className={getTierColor()}>
              {subscriptionInfo?.subscribed ? 'Paid' : 'Free'}
            </Badge>
          </div>

          {subscriptionInfo?.subscribed && subscriptionInfo?.subscription_end && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Next billing date: {formatDate(subscriptionInfo.subscription_end)}
            </div>
          )}

          <Separator />

          <div className="flex gap-2">
            {subscriptionInfo?.subscribed ? (
              <Button
                onClick={handleManageSubscription}
                disabled={isLoading}
                className="flex-1"
              >
                <ArrowUpRight className="h-4 w-4 mr-2" />
                {isLoading ? 'Loading...' : 'Manage Subscription'}
              </Button>
            ) : (
              <Button
                onClick={() => window.location.href = '/pricing'}
                className="flex-1"
              >
                View Plans
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usage Information */}
      {usage && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Usage</CardTitle>
            <CardDescription>
              Your current usage for this billing period
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Document Uploads</span>
                  <span className="font-medium">
                    {usage.uploads.used}{usage.uploads.limit === -1 ? '' : ` / ${usage.uploads.limit}`}
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      usage.uploads.limit === -1 
                        ? 'bg-green-500' 
                        : usage.uploads.used >= usage.uploads.limit 
                        ? 'bg-red-500' 
                        : 'bg-primary'
                    }`}
                    style={{
                      width: usage.uploads.limit === -1 
                        ? '100%' 
                        : `${Math.min((usage.uploads.used / usage.uploads.limit) * 100, 100)}%`
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Consultant Escalations</span>
                  <span className="font-medium">
                    {usage.escalations.used}{usage.escalations.limit === -1 ? '' : ` / ${usage.escalations.limit}`}
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      usage.escalations.limit === -1 
                        ? 'bg-green-500' 
                        : usage.escalations.used >= usage.escalations.limit 
                        ? 'bg-red-500' 
                        : 'bg-primary'
                    }`}
                    style={{
                      width: usage.escalations.limit === -1 
                        ? '100%' 
                        : `${Math.min((usage.escalations.used / usage.escalations.limit) * 100, 100)}%`
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan Features */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {subscriptionInfo?.subscription_tier === 'Basic' && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span className="text-sm">Ask the AI cybersecurity questions</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span className="text-sm">Access compliance frameworks (NIST, CMMC, etc.)</span>
                </div>
              </>
            )}
            
            {subscriptionInfo?.subscription_tier === 'Pro' && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span className="text-sm">Everything in Basic</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span className="text-sm">Upload up to 5 documents/month</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span className="text-sm">AI-generated policies and templates</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span className="text-sm">1 escalation per month to human consultant</span>
                </div>
              </>
            )}

            {subscriptionInfo?.subscription_tier === 'Premium' && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span className="text-sm">Everything in Pro</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span className="text-sm">Unlimited document uploads</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span className="text-sm">2 live consultation calls/month</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span className="text-sm">Priority escalation review (1 business day)</span>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
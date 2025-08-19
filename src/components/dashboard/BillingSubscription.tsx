import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Check, CreditCard, Download, Shield, Zap, Star } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  pdf_url?: string;
}

const plans = [
  {
    id: 'basic',
    name: 'Basic',
    price: 0,
    description: 'For exploring cybersecurity guidance using AI',
    priceId: null, // Free plan
    features: [
      'Ask the AI cybersecurity questions',
      'Access compliance frameworks (NIST, CMMC, etc.) via AI',
      'Free forever',
    ],
    excludedFeatures: ['Document uploads', 'Access to human consultants', 'Escalation features'],
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 49,
    description: 'For generating cybersecurity policies and receiving occasional expert guidance',
    priceId: 'price_pro_monthly', // Replace with actual Stripe price ID
    features: [
      'Everything in Basic',
      'Upload up to 5 documents/month',
      'Get AI-generated policies, templates, and framework mappings',
      '1 escalation per month to a human consultant',
      'Priority AI support with enhanced memory',
      'Cancel anytime',
    ],
    excludedFeatures: ['Live calls'],
    popular: true,
  },
  {
    id: 'executive',
    name: 'Executive',
    price: 149,
    description: 'For ongoing advisory and access to a dedicated expert',
    priceId: 'price_executive_monthly', // Replace with actual Stripe price ID
    features: [
      'Everything in Pro',
      'Upload unlimited documents',
      '2 live consultation calls/month (up to 60 minutes total)',
      'Escalations reviewed within 1 business day',
      'Monthly compliance posture review',
      'Consultant-reviewed documents with actionable comments',
      'Cancel anytime',
    ],
    excludedFeatures: [],
    popular: false,
  },
];

export function BillingSubscription() {
  const { user, subscriptionInfo, checkSubscription } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [invoicesLoading, setInvoicesLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchInvoices();
    }
  }, [user]);

  const fetchInvoices = async () => {
    // Mock invoice data - in a real app, this would come from your backend
    const mockInvoices: Invoice[] = [
      {
        id: 'inv_001',
        amount: 4900,
        currency: 'usd',
        status: 'paid',
        created_at: '2024-01-15T10:00:00Z',
        pdf_url: '#',
      },
      {
        id: 'inv_002',
        amount: 4900,
        currency: 'usd',
        status: 'paid',
        created_at: '2023-12-15T10:00:00Z',
        pdf_url: '#',
      },
    ];

    setTimeout(() => {
      setInvoices(mockInvoices);
      setInvoicesLoading(false);
    }, 1000);
  };

  const handleUpgrade = async (priceId: string | null) => {
    if (!priceId) {
      toast.info('You are already on the Basic plan');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId },
      });

      if (error) throw error;

      if (data?.url) {
        // Open Stripe checkout in a new tab
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      console.error('Error creating checkout:', error);
      toast.error(error.message || 'Failed to create checkout session');
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentPlan = () => {
    return subscriptionInfo?.subscription_tier || 'Basic';
  };

  const isCurrentPlan = (planId: string) => {
    if (!subscriptionInfo) return planId === 'basic';

    const tierMap = {
      Basic: 'basic',
      Pro: 'pro',
      Premium: 'executive',
    };

    return tierMap[subscriptionInfo.subscription_tier] === planId;
  };

  return (
    <div className="page">
      <div className="page-title">
        <h1 className="text-2xl font-bold tracking-tight">Billing & Subscription</h1>
        <p className="text-muted-foreground">Manage your subscription and billing information</p>
      </div>

      {/* Current Plan Status */}
      <div className="section-card">
        <h2 className="mb-space-4 flex items-center gap-space-2 text-xl font-semibold">
          <CreditCard className="h-5 w-5" />
          Current Plan
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant={subscriptionInfo?.subscribed ? 'default' : 'secondary'}>
                {getCurrentPlan()}
              </Badge>
              {subscriptionInfo?.subscription_end && (
                <span className="text-sm text-muted-foreground">
                  Renews {format(new Date(subscriptionInfo.subscription_end), 'MMM dd, yyyy')}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {subscriptionInfo?.subscribed
                ? 'Your subscription is active'
                : 'Upgrade to unlock premium features'}
            </p>
          </div>
          {subscriptionInfo?.subscribed && (
            <Button variant="outline" onClick={handleManageSubscription} disabled={loading}>
              Manage Subscription
            </Button>
          )}
        </div>
      </div>

      {/* Plan Comparison */}
      <div>
        <h2 className="mb-space-4 text-xl font-semibold">Choose Your Plan</h2>
        <div className="grid-2 gap-space-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative flex h-full flex-col ${
                plan.popular ? 'scale-105 border-primary' : ''
              } ${isCurrentPlan(plan.id) ? 'ring-2 ring-primary' : ''}`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 transform bg-primary text-primary-foreground">
                  <Star className="mr-1 h-3 w-3" />
                  Most Popular
                </Badge>
              )}

              {isCurrentPlan(plan.id) && (
                <Badge variant="secondary" className="absolute -top-3 right-4">
                  Your Plan
                </Badge>
              )}

              <CardHeader className="pb-4 text-center">
                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="text-muted-foreground">{plan.price === 0 ? '' : '/mo'}</span>
                </div>
                <CardDescription className="mt-2">{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="flex-grow space-y-4">
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                      <span className="text-sm leading-relaxed">{feature}</span>
                    </li>
                  ))}
                  {plan.excludedFeatures?.map((feature, index) => (
                    <li key={`excluded-${index}`} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center">
                        <div className="h-0.5 w-3 rounded bg-red-500"></div>
                      </div>
                      <span className="text-sm leading-relaxed text-muted-foreground line-through">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardContent className="mt-auto pt-0">
                {plan.price === 0 ? (
                  <Button
                    className="w-full"
                    variant={plan.popular ? 'default' : 'outline'}
                    disabled={isCurrentPlan(plan.id) || loading}
                  >
                    {isCurrentPlan(plan.id)
                      ? 'Current Plan'
                      : 'Start Free — No Credit Card Required'}
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={() => handleUpgrade(plan.priceId)}
                    disabled={isCurrentPlan(plan.id) || loading}
                  >
                    {isCurrentPlan(plan.id) ? 'Current Plan' : 'Start — Cancel Anytime'}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Security Badge */}
      <div className="section-card border-green-200 bg-gradient-to-r from-green-50 to-blue-50">
        <div className="flex items-center gap-space-3">
          <Shield className="h-8 w-8 text-green-600" />
          <div>
            <h3 className="font-semibold text-green-800">Secure Payment Processing</h3>
            <p className="text-sm text-green-700">
              Your payment information is encrypted and secured by Stripe, a PCI-compliant payment
              processor trusted by millions of businesses worldwide.
            </p>
          </div>
        </div>
      </div>

      {/* Invoice History */}
      <div className="section-card">
        <h2 className="mb-space-2 flex items-center gap-space-2 text-xl font-semibold">
          <Download className="h-5 w-5" />
          Invoice History
        </h2>
        <p className="mb-space-4 text-muted-foreground">Download your past invoices</p>
        {invoicesLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : invoices.length > 0 ? (
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">Invoice #{invoice.id}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(invoice.created_at), 'MMM dd, yyyy')} • $
                    {(invoice.amount / 100).toFixed(2)} USD
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                    {invoice.status}
                  </Badge>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No invoices available</p>
        )}
      </div>
    </div>
  );
}

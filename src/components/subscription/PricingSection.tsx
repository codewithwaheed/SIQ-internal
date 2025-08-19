import { Check, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const pricingPlans = [
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
    isPopular: false,
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
    isPopular: true,
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
    isPopular: false,
  },
];

export function PricingSection() {
  const { user, session, subscriptionInfo } = useAuth();

  const handleSubscribe = async (priceId: string | null) => {
    if (!priceId) {
      toast.info('You are already on the Basic plan');
      return;
    }

    // If user is not authenticated, redirect to auth page with the priceId
    if (!user) {
      const authUrl = `/auth?priceId=${encodeURIComponent(priceId)}&redirect=checkout`;
      window.location.href = authUrl;
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;

      // Open Stripe checkout in a new tab
      window.open(data.url, '_blank');
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      toast.error(error.message || 'Failed to create checkout session');
    }
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
    <section className="mx-auto max-w-7xl px-4 py-20 md:px-6 lg:px-8">
      <div className="mb-16 text-center">
        <h2 className="mb-4 text-4xl font-bold">SentrIQ Pricing</h2>
        <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
          Your intelligent AI assistant for document analysis, insights, and expert support.
        </p>
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-3">
        {pricingPlans.map((plan) => (
          <Card
            key={plan.id}
            className={`relative flex h-full flex-col ${plan.isPopular ? 'scale-105 border-primary' : ''} ${isCurrentPlan(plan.id) ? 'ring-2 ring-primary' : ''}`}
          >
            {plan.isPopular && (
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
                <span className="text-muted-foreground">/mo</span>
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

            <CardFooter className="mt-auto">
              {plan.price === 0 ? (
                <Link to="/auth" className="w-full">
                  <Button className="w-full" variant={plan.isPopular ? 'default' : 'outline'}>
                    Start Free — No Credit Card Required
                  </Button>
                </Link>
              ) : (
                <Button
                  className="w-full"
                  variant={plan.isPopular ? 'default' : 'outline'}
                  onClick={() => handleSubscribe(plan.priceId)}
                  disabled={isCurrentPlan(plan.id)}
                >
                  {isCurrentPlan(plan.id) ? 'Current Plan' : 'Start — Cancel Anytime'}
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="mt-16 text-center">
        <h3 className="mb-4 text-xl font-semibold">Add-Ons</h3>
        <div className="mx-auto mb-8 grid max-w-2xl gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="p-4">
              <div className="font-medium">Extra escalation (async)</div>
              <div className="text-sm text-muted-foreground">
                $100 per request (up to 30 minutes)
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="font-medium">Additional live call</div>
              <div className="text-sm text-muted-foreground">$200/hour</div>
            </CardContent>
          </Card>
        </div>
        <p className="text-sm text-muted-foreground">
          All plans include our core AI assistant. Upgrade anytime to unlock more features.
        </p>
      </div>
    </section>
  );
}

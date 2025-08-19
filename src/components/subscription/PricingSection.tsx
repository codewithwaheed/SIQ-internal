import { Check, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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
      'Free forever'
    ],
    excludedFeatures: [
      'Document uploads',
      'Access to human consultants',
      'Escalation features'
    ],
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
      'Cancel anytime'
    ],
    excludedFeatures: [
      'Live calls'
    ],
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
      'Cancel anytime'
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
      'Basic': 'basic',
      'Pro': 'pro', 
      'Premium': 'executive'
    };
    
    return tierMap[subscriptionInfo.subscription_tier] === planId;
  };

  return (
    <section className="py-20 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-bold mb-4">
          SentrIQ Pricing
        </h2>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Your intelligent AI assistant for document analysis, insights, and expert support.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {pricingPlans.map((plan) => (
          <Card 
            key={plan.id} 
            className={`relative flex flex-col h-full ${plan.isPopular ? 'border-primary scale-105' : ''} ${isCurrentPlan(plan.id) ? 'ring-2 ring-primary' : ''}`}
          >
            {plan.isPopular && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground">
                <Star className="w-3 h-3 mr-1" />
                Most Popular
              </Badge>
            )}
            
            {isCurrentPlan(plan.id) && (
              <Badge variant="secondary" className="absolute -top-3 right-4">
                Your Plan
              </Badge>
            )}

            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
              <div className="flex items-center justify-center gap-1">
                <span className="text-4xl font-bold">${plan.price}</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
              <CardDescription className="mt-2">
                {plan.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 flex-grow">
              <ul className="space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm leading-relaxed">{feature}</span>
                  </li>
                ))}
                {plan.excludedFeatures?.map((feature, index) => (
                  <li key={`excluded-${index}`} className="flex items-start gap-3">
                    <div className="w-5 h-5 mt-0.5 flex-shrink-0 flex items-center justify-center">
                      <div className="w-3 h-0.5 bg-red-500 rounded"></div>
                    </div>
                    <span className="text-sm leading-relaxed text-muted-foreground line-through">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter className="mt-auto">
              {plan.price === 0 ? (
                <Link to="/auth" className="w-full">
                  <Button
                    className="w-full"
                    variant={plan.isPopular ? "default" : "outline"}
                  >
                    Start Free — No Credit Card Required
                  </Button>
                </Link>
              ) : (
                <Button
                  className="w-full"
                  variant={plan.isPopular ? "default" : "outline"}
                  onClick={() => handleSubscribe(plan.priceId)}
                  disabled={isCurrentPlan(plan.id)}
                >
                  {isCurrentPlan(plan.id) 
                    ? 'Current Plan' 
                    : 'Start — Cancel Anytime'
                  }
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="text-center mt-16">
        <h3 className="text-xl font-semibold mb-4">Add-Ons</h3>
        <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="font-medium">Extra escalation (async)</div>
              <div className="text-sm text-muted-foreground">$100 per request (up to 30 minutes)</div>
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
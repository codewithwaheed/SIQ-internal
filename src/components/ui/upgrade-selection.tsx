import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Crown, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface UpgradeSelectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Use the same pricing data as PricingSection for consistency
const plans = [
  {
    id: 'pro',
    name: 'Pro',
    price: '$49',
    period: '/month',
    description: 'For generating cybersecurity policies and receiving occasional expert guidance',
    icon: <Crown className="w-6 h-6 text-blue-500" />,
    features: [
      'Everything in Basic',
      'Upload up to 5 documents/month',
      'Get AI-generated policies, templates, and framework mappings',
      '1 escalation per month to a human consultant',
      'Priority AI support with enhanced memory',
      'Cancel anytime'
    ],
    popular: true,
    stripePriceId: 'price_pro_monthly'
  },
  {
    id: 'executive',
    name: 'Executive',
    price: '$149',
    period: '/month',
    description: 'For ongoing advisory and access to a dedicated expert',
    icon: <Zap className="w-6 h-6 text-purple-500" />,
    features: [
      'Everything in Pro',
      'Upload unlimited documents',
      '2 live consultation calls/month (up to 60 minutes total)',
      'Escalations reviewed within 1 business day',
      'Monthly compliance posture review',
      'Consultant-reviewed documents with actionable comments',
      'Cancel anytime'
    ],
    popular: false,
    stripePriceId: 'price_executive_monthly'
  }
];

export function UpgradeSelection({ open, onOpenChange }: UpgradeSelectionProps) {
  const [loading, setLoading] = React.useState<string | null>(null);

  const handleUpgrade = async (priceId: string, planName: string) => {
    setLoading(planName);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId }
      });
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
        onOpenChange(false);
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Stripe checkout failed:', error);
      // You might want to show a toast error here
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Choose Your Plan
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative ${
                plan.popular 
                  ? 'border-primary shadow-lg scale-105' 
                  : 'border-border'
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground">
                  Most Popular
                </Badge>
              )}
              
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-2">
                  {plan.icon}
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>
              
              <CardContent className="pt-2">
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className="w-full" 
                  onClick={() => handleUpgrade(plan.stripePriceId, plan.name)}
                  disabled={loading === plan.name}
                  variant={plan.popular ? "default" : "outline"}
                >
                  {loading === plan.name ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                      Processing...
                    </div>
                  ) : (
                    `Upgrade to ${plan.name}`
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
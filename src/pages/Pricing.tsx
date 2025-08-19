import { Navigation } from "@/components/ui/navigation";
import { Footer } from "@/components/ui/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";

const Pricing = () => {
  const plans = [
    {
      name: "Basic",
      price: "$0",
      period: "per month",
      description: "For exploring cybersecurity guidance using AI",
      features: [
        "Ask the AI cybersecurity questions",
        "Access compliance frameworks (NIST, CMMC, etc.) via AI",
        "Free forever"
      ],
      cta: "Start Free",
      popular: false
    },
    {
      name: "Pro",
      price: "$49",
      period: "per month",
      description: "For generating cybersecurity policies and receiving occasional expert guidance",
      features: [
        "Everything in Basic",
        "Upload up to 5 documents/month",
        "Get AI-generated policies, templates, and framework mappings",
        "1 escalation per month to a human consultant",
        "Priority AI support with enhanced memory",
        "Cancel anytime"
      ],
      cta: "Start Pro Plan",
      popular: true
    },
    {
      name: "Executive",
      price: "$149",
      period: "per month",
      description: "For ongoing advisory and access to a dedicated expert",
      features: [
        "Everything in Pro",
        "Upload unlimited documents",
        "2 live consultation calls/month (up to 60 minutes total)",
        "Escalations reviewed within 1 business day",
        "Monthly compliance posture review",
        "Consultant-reviewed documents with actionable comments",
        "Cancel anytime"
      ],
      cta: "Start Executive Plan",
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <Navigation />
      
      <main className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-16 animate-fade-in">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Choose the plan that fits your business needs. All plans include a 14-day free trial.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid lg:grid-cols-3 gap-8 mb-16">
            {plans.map((plan, index) => (
              <Card key={index} className={`relative hover-scale transition-all duration-300 animate-fade-in ${plan.popular ? 'ring-2 ring-primary' : ''}`} style={{animationDelay: `${index * 200}ms`}}>
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">/{plan.period}</span>
                  </div>
                  <CardDescription className="mt-2">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <Check className="h-4 w-4 text-primary mr-3 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full transition-all duration-200 hover:scale-105" 
                    variant={plan.popular ? "default" : "outline"}
                    asChild
                  >
                    {plan.name === "Basic" ? (
                      <Link to="/auth">{plan.cta}</Link>
                    ) : (
                      <Link to={`/auth?priceId=${plan.name === "Pro" ? "price_pro_monthly" : "price_executive_monthly"}&redirect=checkout`}>{plan.cta}</Link>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* FAQ Section */}
          <div className="max-w-3xl mx-auto animate-fade-in" style={{animationDelay: '600ms'}}>
            <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">What's included in the free trial?</h3>
                <p className="text-muted-foreground">
                  All plans include a 14-day free trial with full access to features. No credit card required.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Can I change plans anytime?</h3>
                <p className="text-muted-foreground">
                  Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">What payment methods do you accept?</h3>
                <p className="text-muted-foreground">
                  We accept all major credit cards (Visa, Mastercard, American Express, Discover), debit cards, digital wallets (Apple Pay, Google Pay), bank transfers, SEPA Direct Debit, and can provide invoicing for enterprise customers. All payments are securely processed through Stripe.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Pricing;
import { Check, Star, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const plans = [
  {
    name: "Basic",
    price: "$0",
    period: "/month",
    description: "For exploring cybersecurity guidance using AI",
    features: [
      "Ask the AI cybersecurity questions",
      "Access compliance frameworks (NIST, CMMC, etc.) via AI",
      "Free forever"
    ],
    buttonText: "Start Free",
    popular: false
  },
  {
    name: "Pro",
    price: "$49",
    period: "/month",
    description: "For generating cybersecurity policies and receiving occasional expert guidance",
    features: [
      "Everything in Basic",
      "Upload up to 5 documents/month",
      "Get AI-generated policies, templates, and framework mappings",
      "1 escalation per month to a human consultant",
      "Priority AI support with enhanced memory",
      "Cancel anytime"
    ],
    buttonText: "Start Pro Plan",
    popular: true
  },
  {
    name: "Executive",
    price: "$149",
    period: "/month",
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
    buttonText: "Start Executive Plan",
    popular: false
  }
];

export const PricingSection = () => {
  return (
    <section className="py-16 lg:py-24 bg-gradient-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Choose your AI plan
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Start with AI-powered assistance and scale up to full expert support as your needs grow.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <Card 
              key={index} 
              className={`relative ${plan.popular ? 'ring-2 ring-accent shadow-elevated' : ''} hover:shadow-elevated transition-all duration-300`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-accent text-accent-foreground">
                  <Star className="h-3 w-3 mr-1" />
                  Most Popular
                </Badge>
              )}
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="flex items-baseline justify-center space-x-1">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <p className="text-muted-foreground text-sm">{plan.description}</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center space-x-3">
                      <Check className="h-4 w-4 text-success" />
                      <span className="text-foreground text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className={`w-full ${plan.popular ? 'bg-gradient-primary hover:bg-primary-glow' : ''}`}
                  variant={plan.popular ? 'default' : 'outline'}
                >
                  {plan.buttonText}
                  {plan.buttonText === "Contact Sales" ? null : <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="text-center mt-12">
          <p className="text-muted-foreground">
            All plans include a 14-day free trial. No credit card required.
          </p>
        </div>
      </div>
    </section>
  );
};
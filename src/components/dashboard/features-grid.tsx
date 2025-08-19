import React, { useEffect } from "react";
import { MessageSquare, Upload, Search, Users, Shield, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RestrictedButton, UpgradePrompt } from "@/components/ui/feature-gate";
import { FeatureKey, useFeatureGating } from "@/hooks/useFeatureGating";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const features = [
  {
    title: "AI Compliance Assistant",
    description: "Get instant answers about NIST 800-171, CMMC, and FedRAMP requirements",
    icon: MessageSquare,
    color: "text-accent",
    featureKey: null // Basic feature
  },
  {
    title: "Document Review",
    description: "Upload policies and procedures for AI-powered compliance assessment",
    icon: Upload,
    color: "text-success",
    featureKey: "document_upload" as FeatureKey
  },
  {
    title: "Searchable History",
    description: "Access complete chat transcripts and compliance guidance history",
    icon: Search,
    color: "text-primary",
    featureKey: null // Basic feature
  },
  {
    title: "Expert Escalation",
    description: "Connect with certified cybersecurity consultants when you need human expertise",
    icon: Users,
    color: "text-warning",
    featureKey: "escalation" as FeatureKey
  },
  {
    title: "Framework Coverage",
    description: "Comprehensive coverage of NIST, CMMC, FedRAMP, and industry best practices",
    icon: Shield,
    color: "text-accent",
    featureKey: null // Basic feature
  },
  {
    title: "Policy Templates",
    description: "Generate customized security policies tailored to your business requirements",
    icon: FileText,
    color: "text-success",
    featureKey: "export_policies" as FeatureKey
  }
];

export const FeaturesGrid = () => {
  const { user } = useAuth();
  const { checkFeatureAccess, getFeatureConfig } = useFeatureGating();

  // Track feature views
  const trackFeatureView = async (feature: string) => {
    if (!user) return;
    
    try {
      await supabase.functions.invoke('audit-log', {
        body: {
          action: 'FEATURE_VIEWED',
          description: `Feature viewed: ${feature}`,
          metadata: { feature, location: 'features_grid' }
        }
      });
    } catch (error) {
      console.error('Error tracking feature view:', error);
    }
  };

  // Track feature interaction
  const trackFeatureInteraction = async (feature: string, action: string) => {
    if (!user) return;
    
    try {
      await supabase.functions.invoke('audit-log', {
        body: {
          action: 'FEATURE_INTERACTION',
          description: `Feature ${action}: ${feature}`,
          metadata: { feature, action, location: 'features_grid' }
        }
      });
    } catch (error) {
      console.error('Error tracking feature interaction:', error);
    }
  };

  useEffect(() => {
    trackFeatureView('features_grid_page');
  }, []);

  const getFeatureStatus = (featureKey: FeatureKey | null) => {
    if (!featureKey) return { hasAccess: true, tier: null };
    const access = checkFeatureAccess(featureKey);
    const config = getFeatureConfig(featureKey);
    return { hasAccess: access.hasAccess, tier: config.requiredTier };
  };

  return (
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Everything you need for compliance success
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            From AI-powered guidance to expert consultation, we provide comprehensive 
            support for your cybersecurity compliance journey.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const status = getFeatureStatus(feature.featureKey);
            
            return (
              <Card key={index} className="group hover:shadow-elevated transition-all duration-300 animate-fade-in relative overflow-hidden">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg bg-muted ${feature.color}`}>
                        <feature.icon className="h-6 w-6" />
                      </div>
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                    </div>
                    {status.tier && (
                      <Badge 
                        variant={status.hasAccess ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {status.tier}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-muted-foreground">{feature.description}</p>
                  
                  {feature.featureKey && !status.hasAccess && (
                    <UpgradePrompt
                      feature={feature.featureKey}
                      trigger={
                        <RestrictedButton
                          feature={feature.featureKey}
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => trackFeatureInteraction(feature.title, 'upgrade_prompt_clicked')}
                        >
                          Try {feature.title}
                        </RestrictedButton>
                      }
                    />
                  )}
                  
                  {feature.featureKey && status.hasAccess && (
                    <div className="flex items-center gap-2 text-sm text-success">
                      <div className="w-2 h-2 bg-success rounded-full" />
                      <span>Available in your plan</span>
                    </div>
                  )}
                  
                  {!feature.featureKey && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-2 h-2 bg-accent rounded-full" />
                      <span>Included with all plans</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
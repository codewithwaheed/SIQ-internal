import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';

export type SubscriptionTier = 'Basic' | 'Pro' | 'Premium';
export type FeatureKey = 
  | 'document_upload'
  | 'escalation'
  | 'live_consultation'
  | 'unlimited_documents'
  | 'priority_support'
  | 'compliance_review'
  | 'consultant_reviews'
  | 'advanced_ai'
  | 'export_policies'
  | 'custom_templates';

interface FeatureConfig {
  name: string;
  description: string;
  requiredTier: SubscriptionTier;
  monthlyLimit?: number;
  icon?: string;
}

// Feature configuration mapping
const FEATURE_CONFIG: Record<FeatureKey, FeatureConfig> = {
  document_upload: {
    name: 'Document Upload',
    description: 'Upload and analyze documents with AI',
    requiredTier: 'Pro',
    monthlyLimit: 5,
    icon: 'Upload'
  },
  escalation: {
    name: 'Expert Escalation',
    description: 'Get help from human cybersecurity experts',
    requiredTier: 'Premium',
    monthlyLimit: 2,
    icon: 'Users'
  },
  live_consultation: {
    name: 'Live Consultation Calls',
    description: 'Schedule live calls with cybersecurity experts',
    requiredTier: 'Premium',
    monthlyLimit: 2,
    icon: 'Phone'
  },
  unlimited_documents: {
    name: 'Unlimited Documents',
    description: 'Upload unlimited documents per month',
    requiredTier: 'Premium',
    icon: 'FileText'
  },
  priority_support: {
    name: 'Priority Support',
    description: 'Get priority responses from AI and experts',
    requiredTier: 'Pro',
    icon: 'Star'
  },
  compliance_review: {
    name: 'Compliance Posture Review',
    description: 'Monthly compliance posture review',
    requiredTier: 'Premium',
    monthlyLimit: 1,
    icon: 'Shield'
  },
  consultant_reviews: {
    name: 'Consultant-Reviewed Documents',
    description: 'Get expert reviews with actionable comments',
    requiredTier: 'Premium',
    icon: 'UserCheck'
  },
  advanced_ai: {
    name: 'Enhanced AI Memory',
    description: 'AI with enhanced context and memory',
    requiredTier: 'Pro',
    icon: 'Brain'
  },
  export_policies: {
    name: 'Export Policies',
    description: 'Export generated policies and templates',
    requiredTier: 'Pro',
    icon: 'Download'
  },
  custom_templates: {
    name: 'Custom Templates',
    description: 'Create and use custom policy templates',
    requiredTier: 'Premium',
    icon: 'FileText'
  }
};

// Tier hierarchy for comparison
const TIER_HIERARCHY: Record<SubscriptionTier, number> = {
  'Basic': 0,
  'Pro': 1,
  'Premium': 2
};

interface FeatureAccess {
  hasAccess: boolean;
  reason?: string;
  upgradeRequired?: SubscriptionTier;
  remainingUsage?: number;
  totalLimit?: number;
}

interface UsageInfo {
  monthly_uploads_used?: number;
  monthly_escalations_used?: number;
}

export function useFeatureGating() {
  const { subscriptionInfo, user } = useAuth();

  const currentTier = subscriptionInfo?.subscription_tier || 'Basic';
  const isSubscribed = subscriptionInfo?.subscribed || false;

  // Mock usage data - in a real app, this would come from the backend
  const usageInfo: UsageInfo = useMemo(() => ({
    monthly_uploads_used: 0, // This should be fetched from the backend
    monthly_escalations_used: 0 // This should be fetched from the backend
  }), []);

  const checkFeatureAccess = (feature: FeatureKey): FeatureAccess => {
    if (!user) {
      return { 
        hasAccess: false, 
        reason: 'Authentication required',
        upgradeRequired: 'Basic'
      };
    }

    const config = FEATURE_CONFIG[feature];
    const currentTierLevel = TIER_HIERARCHY[currentTier];
    const requiredTierLevel = TIER_HIERARCHY[config.requiredTier];
    
    // Check tier requirement
    if (currentTierLevel < requiredTierLevel) {
      return {
        hasAccess: false,
        reason: `Requires ${config.requiredTier} subscription`,
        upgradeRequired: config.requiredTier
      };
    }
    
    // Check subscription status
    if (config.requiredTier !== 'Basic' && !isSubscribed) {
      return {
        hasAccess: false,
        reason: 'Active subscription required',
        upgradeRequired: config.requiredTier
      };
    }
    
    // Check monthly limits
    if (config.monthlyLimit) {
      let used = 0;
      
      switch (feature) {
        case 'document_upload':
          used = usageInfo.monthly_uploads_used || 0;
          break;
        case 'escalation':
        case 'live_consultation':
          used = usageInfo.monthly_escalations_used || 0;
          break;
      }
      
      if (used >= config.monthlyLimit) {
        return {
          hasAccess: false,
          reason: 'Monthly limit reached',
          upgradeRequired: getNextTier(),
          remainingUsage: 0,
          totalLimit: config.monthlyLimit
        };
      }
      
      return {
        hasAccess: true,
        remainingUsage: config.monthlyLimit - used,
        totalLimit: config.monthlyLimit
      };
    }
    
    return { hasAccess: true };
  };

  const getFeatureConfig = (feature: FeatureKey) => FEATURE_CONFIG[feature];

  const getAllFeatureAccess = () => {
    return Object.fromEntries(
      Object.keys(FEATURE_CONFIG).map(feature => [
        feature,
        checkFeatureAccess(feature as FeatureKey)
      ])
    );
  };

  const canUpgrade = () => {
    const tierLevels = ['Basic', 'Pro', 'Premium'];
    const currentIndex = tierLevels.indexOf(currentTier);
    return currentIndex < tierLevels.length - 1;
  };

  const getNextTier = (): SubscriptionTier | null => {
    if (currentTier === 'Basic') return 'Pro';
    if (currentTier === 'Pro') return 'Premium';
    return null;
  };

  const getUpgradeUrl = (targetTier?: SubscriptionTier) => {
    const tier = targetTier || getNextTier();
    if (!tier) return '/billing';
    
    // Map tier to pricing plan ID
    const tierToPlanId = {
      'Basic': 'basic',
      'Pro': 'pro',
      'Premium': 'executive'
    };
    
    return `/pricing#${tierToPlanId[tier]}`;
  };

  return {
    currentTier,
    isSubscribed,
    checkFeatureAccess,
    getFeatureConfig,
    getAllFeatureAccess,
    canUpgrade,
    getNextTier,
    getUpgradeUrl,
    usageInfo,
    FEATURE_CONFIG
  };
}
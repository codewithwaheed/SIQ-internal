import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, MessageSquare, Users, TrendingUp } from 'lucide-react';

interface UpgradePromptProps {
  feature: string;
  currentTier: string;
  requiredTier: string;
  onUpgrade?: () => void;
}

export function UpgradePrompt({ feature, currentTier, requiredTier, onUpgrade }: UpgradePromptProps) {
  return (
    <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
          <AlertTriangle className="h-5 w-5" />
          Upgrade Required
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-orange-700 dark:text-orange-300">
            <strong>{feature}</strong> requires a <strong>{requiredTier}</strong> subscription.
          </p>
          <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
            You're currently on the <Badge variant="outline">{currentTier}</Badge> plan.
          </p>
        </div>
        
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-orange-800 dark:text-orange-200">
            What you'll get with {requiredTier}:
          </h4>
          <ul className="text-xs text-orange-700 dark:text-orange-300 space-y-1">
            {requiredTier === 'Premium' && (
              <>
                <li className="flex items-center gap-2">
                  <MessageSquare className="h-3 w-3" />
                  Direct access to cybersecurity consultants
                </li>
                <li className="flex items-center gap-2">
                  <Users className="h-3 w-3" />
                  Priority support and faster response times
                </li>
                <li className="flex items-center gap-2">
                  <TrendingUp className="h-3 w-3" />
                  Advanced analytics and custom reports
                </li>
              </>
            )}
            {requiredTier === 'Pro' && (
              <>
                <li className="flex items-center gap-2">
                  <MessageSquare className="h-3 w-3" />
                  Document upload and analysis
                </li>
                <li className="flex items-center gap-2">
                  <TrendingUp className="h-3 w-3" />
                  Enhanced AI responses
                </li>
              </>
            )}
          </ul>
        </div>

        <div className="flex gap-2">
          <Button size="sm" onClick={onUpgrade}>
            Upgrade to {requiredTier}
          </Button>
          <Button variant="outline" size="sm">
            Learn More
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
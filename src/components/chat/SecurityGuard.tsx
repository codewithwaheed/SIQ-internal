// Security Guard Component for Chat Interface
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle } from 'lucide-react';
import {
  guardRequest,
  getComplianceTopicSuggestion,
  COMPLIANCE_TOPICS,
} from '@/lib/security-guard';

interface SecurityGuardProps {
  userMessage: string;
  userRole: string;
  userId: string;
  onMessageBlocked?: (blockedMessage: string, reason: string) => void;
  onContinue?: () => void;
}

export const SecurityGuard: React.FC<SecurityGuardProps> = ({
  userMessage,
  userRole,
  userId,
  onMessageBlocked,
  onContinue,
}) => {
  const guardResult = guardRequest(userMessage, userRole, userId);

  if (!guardResult.blocked) {
    return null;
  }

  // Log the blocked attempt for audit purposes
  if (onMessageBlocked) {
    onMessageBlocked(userMessage, 'Security guard blocked unauthorized data request');
  }

  return (
    <div className="space-y-4 rounded-lg border bg-background p-4">
      <Alert variant={guardResult.shouldRedirect ? 'destructive' : 'default'}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-sm">{guardResult.message}</AlertDescription>
      </Alert>

      {!guardResult.shouldRedirect && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Shield className="h-4 w-4 text-primary" />
            Compliance Topics I Can Help With:
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {COMPLIANCE_TOPICS.slice(0, 6).map((topic, index) => (
              <button
                key={index}
                onClick={() => {
                  if (onContinue) {
                    // You could trigger a new message with this topic
                    onContinue();
                  }
                }}
                className="rounded border p-2 text-left text-xs transition-colors hover:bg-accent"
              >
                {topic}
              </button>
            ))}
          </div>

          <p className="mt-3 text-xs text-muted-foreground">{getComplianceTopicSuggestion()}</p>
        </div>
      )}
    </div>
  );
};

export default SecurityGuard;

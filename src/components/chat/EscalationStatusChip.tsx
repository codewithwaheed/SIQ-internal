import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Clock, User, AlertTriangle, CheckCircle, Timer, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EscalationStatusChipProps {
  escalation: any;
  className?: string;
}

export const EscalationStatusChip = ({ escalation, className }: EscalationStatusChipProps) => {
  const [detailsOpen, setDetailsOpen] = useState(false);

  if (!escalation) return null;

  const getStatusConfig = (state: string) => {
    switch (state) {
      case 'submitted':
      case 'routing':
        return {
          icon: <Timer className="h-3 w-3" />,
          label: 'Finding Expert',
          color: 'bg-yellow-500',
          textColor: 'text-yellow-800',
          bgColor: 'bg-yellow-50',
        };
      case 'assigned':
        return {
          icon: <User className="h-3 w-3" />,
          label: 'Expert Assigned',
          color: 'bg-blue-500',
          textColor: 'text-blue-800',
          bgColor: 'bg-blue-50',
        };
      case 'in_progress':
        return {
          icon: <MessageSquare className="h-3 w-3" />,
          label: 'Expert Responding',
          color: 'bg-green-500',
          textColor: 'text-green-800',
          bgColor: 'bg-green-50',
        };
      case 'awaiting_user':
        return {
          icon: <AlertTriangle className="h-3 w-3" />,
          label: 'Awaiting Response',
          color: 'bg-orange-500',
          textColor: 'text-orange-800',
          bgColor: 'bg-orange-50',
        };
      case 'resolved':
        return {
          icon: <CheckCircle className="h-3 w-3" />,
          label: 'Resolved',
          color: 'bg-green-600',
          textColor: 'text-green-800',
          bgColor: 'bg-green-50',
        };
      default:
        return {
          icon: <Clock className="h-3 w-3" />,
          label: 'Processing',
          color: 'bg-gray-500',
          textColor: 'text-gray-800',
          bgColor: 'bg-gray-50',
        };
    }
  };

  const statusConfig = getStatusConfig(escalation.escalation_state || escalation.status);
  const consultant = escalation.profiles;

  // Calculate time until SLA deadline
  const slaDeadline = escalation.sla_deadline ? new Date(escalation.sla_deadline) : null;
  const now = new Date();
  const timeUntilSLA = slaDeadline ? Math.max(0, slaDeadline.getTime() - now.getTime()) : null;
  const hoursUntilSLA = timeUntilSLA ? Math.floor(timeUntilSLA / (1000 * 60 * 60)) : null;
  const minutesUntilSLA = timeUntilSLA
    ? Math.floor((timeUntilSLA % (1000 * 60 * 60)) / (1000 * 60))
    : null;

  const formatSLATime = () => {
    if (!hoursUntilSLA && !minutesUntilSLA) return null;
    if (hoursUntilSLA && hoursUntilSLA > 0) {
      return `${hoursUntilSLA}h ${minutesUntilSLA}m`;
    }
    return `${minutesUntilSLA}m`;
  };

  return (
    <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'flex h-auto items-center gap-2 rounded-full border-2 p-2 transition-all hover:scale-105',
            statusConfig.bgColor,
            'border-transparent hover:border-primary/20',
            className,
          )}
        >
          <div className={cn('h-2 w-2 rounded-full', statusConfig.color)} />
          <span className={cn('text-xs font-medium', statusConfig.textColor)}>
            {statusConfig.label}
          </span>
          {formatSLATime() && (
            <Badge variant="outline" className="h-5 px-1 py-0 text-xs">
              {formatSLATime()}
            </Badge>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {statusConfig.icon}
            Escalation Status
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Status */}
          <div className={cn('rounded-lg border-l-4 p-3', statusConfig.bgColor)}>
            <div className="mb-1 flex items-center gap-2">
              {statusConfig.icon}
              <span className="font-medium">{statusConfig.label}</span>
              <Badge variant="outline" className="text-xs">
                {escalation.priority} priority
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Escalated {new Date(escalation.created_at).toLocaleString()}
            </p>
          </div>

          {/* SLA Information */}
          {slaDeadline && (
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="mb-1 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Expected Response</span>
              </div>
              <p className="text-sm">
                {timeUntilSLA && timeUntilSLA > 0 ? (
                  <>
                    By {slaDeadline.toLocaleTimeString()} ({formatSLATime()} remaining)
                  </>
                ) : (
                  <>Response overdue since {slaDeadline.toLocaleTimeString()}</>
                )}
              </p>
            </div>
          )}

          {/* Consultant Information */}
          {consultant && (
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {consultant.first_name?.[0]}
                    {consultant.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {consultant.first_name} {consultant.last_name}
                  </p>
                  {consultant.expertise_areas && (
                    <p className="text-xs text-muted-foreground">
                      {consultant.expertise_areas.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Framework Tags */}
          {escalation.framework_tags && escalation.framework_tags.length > 0 && (
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="mb-2 text-sm font-medium">Relevant Frameworks</p>
              <div className="flex flex-wrap gap-1">
                {escalation.framework_tags.map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag.toUpperCase()}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Routing Score (if available) */}
          {escalation.routing_decision?.final_score && (
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="mb-1 text-sm font-medium">Matching Score</p>
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 rounded-full bg-background">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{
                      width: `${(escalation.routing_decision.final_score / 100) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-xs font-medium">
                  {Math.round(escalation.routing_decision.final_score)}%
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Based on expertise, availability, and response time
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

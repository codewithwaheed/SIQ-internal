import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, CheckCircle, RefreshCw, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { EscalationStatusChip } from './EscalationStatusChip';

interface EscalationStatusProps {
  conversationId: string;
}

export const EscalationStatus = ({ conversationId }: EscalationStatusProps) => {
  const [escalation, setEscalation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchEscalationStatus = async () => {
    try {
      // Check if there's an active escalation for this conversation
      const { data, error } = await supabase
        .from('escalations')
        .select(
          `
          *,
          profiles!escalations_assigned_consultant_fkey(first_name, last_name, expertise_areas)
        `,
        )
        .eq('session_id', conversationId)
        .in('escalation_state', [
          'submitted',
          'routing',
          'assigned',
          'in_progress',
          'awaiting_user',
        ])
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching escalation status:', error);
        return;
      }

      if (data && data.length > 0) {
        setEscalation(data[0]);
      } else {
        setEscalation(null);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEscalationStatus();

    // Set up real-time subscription for escalation updates
    const channel = supabase
      .channel('escalation-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'escalations',
          filter: `session_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log('Escalation update:', payload);
          fetchEscalationStatus();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const handleResolveEscalation = async () => {
    if (!escalation) return;

    try {
      const { data, error } = await supabase.functions.invoke('resolve-escalation', {
        body: {
          escalationId: escalation.id,
          resolvedBy: 'user',
          resolutionNotes: 'Resolved by user',
        },
      });

      if (error || !data.success) {
        throw new Error(data?.error || error?.message || 'Failed to resolve escalation');
      }

      toast({
        title: 'Thank you!',
        description: 'Your escalation has been marked as resolved.',
      });

      setEscalation(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-3">
            <div className="h-4 w-3/4 rounded bg-blue-200"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!escalation) {
    return null;
  }

  const getStatusInfo = (state: string) => {
    switch (state) {
      case 'submitted':
      case 'routing':
        return {
          text: 'Finding expert...',
          color: 'bg-yellow-100 border-yellow-300 text-yellow-800',
          icon: <RefreshCw className="h-4 w-4 animate-spin" />,
        };
      case 'assigned':
        return {
          text: 'Expert assigned',
          color: 'bg-blue-100 border-blue-300 text-blue-800',
          icon: <MessageSquare className="h-4 w-4" />,
        };
      case 'in_progress':
        return {
          text: 'Expert responding',
          color: 'bg-green-100 border-green-300 text-green-800',
          icon: <MessageSquare className="h-4 w-4" />,
        };
      case 'awaiting_user':
        return {
          text: 'Awaiting your response',
          color: 'bg-orange-100 border-orange-300 text-orange-800',
          icon: <AlertTriangle className="h-4 w-4" />,
        };
      default:
        return {
          text: 'Active escalation',
          color: 'bg-gray-100 border-gray-300 text-gray-800',
          icon: <MessageSquare className="h-4 w-4" />,
        };
    }
  };

  const statusInfo = getStatusInfo(escalation.escalation_state || escalation.status);
  const consultant = escalation.profiles;

  // For mobile, show compact status chip
  const isMobile = window.innerWidth < 768;

  if (isMobile) {
    return <EscalationStatusChip escalation={escalation} className="fixed right-4 top-20 z-50" />;
  }

  // Calculate SLA information
  const slaDeadline = escalation.sla_deadline ? new Date(escalation.sla_deadline) : null;
  const now = new Date();
  const isOverdue = slaDeadline && now > slaDeadline;
  const timeUntilSLA = slaDeadline ? Math.max(0, slaDeadline.getTime() - now.getTime()) : null;
  const hoursUntilSLA = timeUntilSLA ? Math.floor(timeUntilSLA / (1000 * 60 * 60)) : null;

  return (
    <Card className={`border-2 ${statusInfo.color} mb-4`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            {statusInfo.icon}
            <div className="flex-1">
              <div className="mb-2 flex items-center space-x-2">
                <span className="font-medium">{statusInfo.text}</span>
                <Badge variant="outline" className="text-xs">
                  {escalation.priority} priority
                </Badge>
                {escalation.framework_tags?.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {escalation.framework_tags[0].toUpperCase()}
                  </Badge>
                )}
              </div>

              {/* SLA Timer */}
              {slaDeadline && (
                <div className="mb-2 flex items-center space-x-2 text-sm">
                  <Clock className="h-4 w-4" />
                  <span
                    className={isOverdue ? 'font-medium text-red-600' : 'text-muted-foreground'}
                  >
                    {isOverdue
                      ? 'Response overdue'
                      : `Expected response by ${slaDeadline.toLocaleTimeString()} ${hoursUntilSLA ? `(${hoursUntilSLA}h)` : ''}`}
                  </span>
                </div>
              )}

              {consultant && (
                <div className="mb-2 flex items-center space-x-2 text-sm">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {consultant.first_name?.[0]}
                      {consultant.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span>
                    {consultant.first_name} {consultant.last_name}
                    {consultant.expertise_areas && (
                      <span className="ml-1 text-muted-foreground">
                        ({consultant.expertise_areas.join(', ')})
                      </span>
                    )}
                  </span>
                </div>
              )}

              {/* Routing Score */}
              {escalation.routing_decision?.final_score && (
                <div className="mb-2 flex items-center space-x-2 text-sm">
                  <span className="text-muted-foreground">Match:</span>
                  <div className="flex items-center space-x-1">
                    <div className="h-1.5 w-16 rounded-full bg-muted">
                      <div
                        className="h-1.5 rounded-full bg-primary"
                        style={{
                          width: `${Math.min(escalation.routing_decision.final_score, 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium">
                      {Math.round(escalation.routing_decision.final_score)}%
                    </span>
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Escalated {new Date(escalation.created_at).toLocaleString()}
              </p>
            </div>
          </div>

          {(escalation.escalation_state === 'in_progress' ||
            escalation.status === 'in_progress') && (
            <Button size="sm" variant="outline" onClick={handleResolveEscalation} className="ml-2">
              <CheckCircle className="mr-1 h-4 w-4" />
              Mark Resolved
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

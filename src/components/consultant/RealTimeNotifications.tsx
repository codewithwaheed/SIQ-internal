import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Bell, X, MessageSquare, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Notification {
  id: string;
  type: 'new_escalation' | 'new_message' | 'urgent_priority';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  conversationId?: string;
}

export const RealTimeNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    // Set up real-time notifications
    const escalationChannel = supabase
      .channel('consultant-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'escalations',
          filter: `assigned_consultant=eq.${user.id}`,
        },
        (payload) => {
          const escalation = payload.new;
          const notification: Notification = {
            id: `escalation_${escalation.id}`,
            type: 'new_escalation',
            title: 'New Escalation Assigned',
            message: `You have been assigned a new ${escalation.priority || 'normal'} priority conversation`,
            timestamp: new Date().toISOString(),
            read: false,
            conversationId: escalation.session_id,
          };

          setNotifications((prev) => [notification, ...prev]);
          setIsVisible(true);

          // Show toast notification
          toast({
            title: notification.title,
            description: notification.message,
          });

          // Auto-hide after 5 seconds
          setTimeout(() => setIsVisible(false), 5000);
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          const message = payload.new;

          // Only show notifications for user messages in conversations assigned to this consultant
          if (message.role === 'user') {
            // Check if this conversation is assigned to current consultant
            checkAssignment(message.conversation_id).then((isAssigned) => {
              if (isAssigned) {
                const notification: Notification = {
                  id: `message_${message.id}`,
                  type: 'new_message',
                  title: 'New User Message',
                  message: 'A user has sent a new message in your assigned conversation',
                  timestamp: new Date().toISOString(),
                  read: false,
                  conversationId: message.conversation_id,
                };

                setNotifications((prev) => [notification, ...prev]);
                setIsVisible(true);

                // Show toast for new user messages
                toast({
                  title: notification.title,
                  description: notification.message,
                });

                // Auto-hide after 3 seconds
                setTimeout(() => setIsVisible(false), 3000);
              }
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(escalationChannel);
    };
  }, [user, toast]);

  const checkAssignment = async (conversationId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('escalations')
        .select('assigned_consultant')
        .eq('session_id', conversationId)
        .eq('assigned_consultant', user?.id)
        .maybeSingle();

      return !error && !!data;
    } catch {
      return false;
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
    );
  };

  const dismissNotification = (notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (!isVisible && unreadCount === 0) return null;

  return (
    <>
      {/* Notification Bell Icon */}
      <div className="fixed right-4 top-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsVisible(!isVisible)}
          className="relative"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Notifications Panel */}
      {isVisible && (
        <div className="fixed right-4 top-16 z-50 max-h-96 w-80">
          <Card className="border shadow-lg">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-semibold">
                  <Bell className="h-4 w-4" />
                  Notifications
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setIsVisible(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="max-h-80 space-y-2 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No new notifications
                  </p>
                ) : (
                  notifications.slice(0, 5).map((notification) => (
                    <div
                      key={notification.id}
                      className={`rounded-lg border p-3 transition-colors ${
                        notification.read ? 'bg-muted/50' : 'border-primary/20 bg-primary/5'
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            {notification.type === 'new_escalation' && (
                              <AlertTriangle className="h-4 w-4 text-orange-500" />
                            )}
                            {notification.type === 'new_message' && (
                              <MessageSquare className="h-4 w-4 text-blue-500" />
                            )}
                            <span className="text-sm font-medium">{notification.title}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{notification.message}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {new Date(notification.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            dismissNotification(notification.id);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {notifications.length > 5 && (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Showing 5 of {notifications.length} notifications
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

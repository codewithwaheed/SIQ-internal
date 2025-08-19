import React, { useState, useEffect } from "react";
import { DashboardLayout } from "./DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Bell,
  BellRing,
  Check,
  Clock,
  AlertTriangle,
  MessageSquare,
  Star,
  Trash2,
  Mail,
  Slack,
  Eye,
  Filter,
} from "lucide-react";

interface Notification {
  id: string;
  type: "new_escalation" | "follow_up" | "feedback" | "system";
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  related_id?: string;
  priority: "low" | "medium" | "high" | "urgent";
  metadata?: any;
}

interface NotificationSettings {
  email_new_escalations: boolean;
  email_follow_ups: boolean;
  email_feedback: boolean;
  slack_new_escalations: boolean;
  slack_follow_ups: boolean;
  slack_feedback: boolean;
  real_time_notifications: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

export const NotificationsInbox = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>({
    email_new_escalations: true,
    email_follow_ups: true,
    email_feedback: false,
    slack_new_escalations: false,
    slack_follow_ups: false,
    slack_feedback: false,
    real_time_notifications: true,
    quiet_hours_enabled: false,
    quiet_hours_start: "22:00",
    quiet_hours_end: "08:00",
  });
  const [filter, setFilter] = useState<
    "all" | "unread" | "escalations" | "feedback"
  >("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      loadNotificationSettings();
      setupRealtimeSubscription();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      // Mock notifications data - in real implementation, this would come from a notifications table
      const mockNotifications: Notification[] = [
        {
          id: "1",
          type: "new_escalation",
          title: "New Escalation - NIST 800-171 Compliance",
          message:
            "TechCorp Solutions has escalated a NIST 800-171 compliance issue marked as urgent priority.",
          read: false,
          created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
          related_id: "escalation-123",
          priority: "urgent",
        },
        {
          id: "2",
          type: "follow_up",
          title: "Follow-up Required",
          message:
            "SecureTech Inc is requesting an update on their CMMC Level 2 assessment progress.",
          read: false,
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          related_id: "escalation-456",
          priority: "high",
        },
        {
          id: "3",
          type: "feedback",
          title: "Client Feedback Received",
          message:
            "DataFlow Systems rated your response 5 stars and left positive feedback.",
          read: true,
          created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
          related_id: "escalation-789",
          priority: "low",
          metadata: {
            rating: 5,
            feedback: "Excellent guidance on policy implementation!",
          },
        },
        {
          id: "4",
          type: "new_escalation",
          title: "New Escalation - Policy Review",
          message:
            "Manufacturing Corp needs assistance with cybersecurity policy review.",
          read: true,
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
          related_id: "escalation-101",
          priority: "medium",
        },
      ];

      setNotifications(mockNotifications);
    } catch (error: any) {
      toast.error("Failed to load notifications");
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadNotificationSettings = async () => {
    try {
      // Mock settings - in real implementation, this would come from user preferences
      const mockSettings: NotificationSettings = {
        email_new_escalations: true,
        email_follow_ups: true,
        email_feedback: false,
        slack_new_escalations: false,
        slack_follow_ups: false,
        slack_feedback: false,
        real_time_notifications: true,
        quiet_hours_enabled: false,
        quiet_hours_start: "22:00",
        quiet_hours_end: "08:00",
      };

      setSettings(mockSettings);
    } catch (error: any) {
      console.error("Error loading notification settings:", error);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!settings.real_time_notifications) return;

    // Set up realtime subscription for new escalations
    const escalationChannel = supabase
      .channel("escalation-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "escalations",
        },
        (payload) => {
          const newNotification: Notification = {
            id: Date.now().toString(),
            type: "new_escalation",
            title: "New Escalation Received",
            message: `A new escalation has been submitted: ${payload.new.reason || "General Support"}`,
            read: false,
            created_at: new Date().toISOString(),
            related_id: payload.new.id,
            priority: payload.new.priority || "medium",
          };

          setNotifications((prev) => [newNotification, ...prev]);

          // Show browser notification if permission granted
          if (Notification.permission === "granted") {
            new Notification("New Escalation", {
              body: newNotification.message,
              icon: "/favicon.ico",
            });
          }

          toast.info("New escalation received", {
            description: newNotification.message,
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(escalationChannel);
    };
  };

  const markAsRead = async (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId ? { ...notif, read: true } : notif,
      ),
    );
    toast.success("Marked as read");
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
    toast.success("All notifications marked as read");
  };

  const deleteNotification = async (notificationId: string) => {
    setNotifications((prev) =>
      prev.filter((notif) => notif.id !== notificationId),
    );
    toast.success("Notification deleted");
  };

  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    toast.success("Notification settings updated");
  };

  const requestNotificationPermission = async () => {
    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        toast.success("Browser notifications enabled");
      }
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "new_escalation":
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case "follow_up":
        return <Clock className="h-4 w-4 text-accent" />;
      case "feedback":
        return <Star className="h-4 w-4 text-success" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-destructive";
      case "high":
        return "bg-warning";
      case "medium":
        return "bg-accent";
      case "low":
        return "bg-muted";
      default:
        return "bg-muted";
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const filteredNotifications = notifications.filter((notif) => {
    if (filter === "unread") return !notif.read;
    if (filter === "escalations")
      return notif.type === "new_escalation" || notif.type === "follow_up";
    if (filter === "feedback") return notif.type === "feedback";
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <DashboardLayout
        title="Notifications & Inbox"
        subtitle="Loading notifications..."
      >
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <div className="page">
      <div className="page-title">
        <h1 className="text-3xl font-bold">Notifications & Inbox</h1>
        <p className="text-muted-foreground">
          Stay updated on escalations and client feedback
        </p>
      </div>
      {/* Header Actions */}
      <div className="section-card flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <BellRing className="h-5 w-5 text-primary" />
            <span className="font-medium">
              {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="all">All</option>
              <option value="unread">Unread</option>
              <option value="escalations">Escalations</option>
              <option value="feedback">Feedback</option>
            </select>
          </div>
        </div>

        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            <Check className="mr-2 h-4 w-4" />
            Mark All Read
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Notification Settings</DialogTitle>
              </DialogHeader>

              <Tabs defaultValue="preferences" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="preferences">Preferences</TabsTrigger>
                  <TabsTrigger value="delivery">Delivery</TabsTrigger>
                </TabsList>

                <TabsContent value="preferences" className="space-y-4">
                  <div className="space-y-4">
                    <h4 className="font-medium">Email Notifications</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <Label>New escalations</Label>
                        </div>
                        <Switch
                          checked={settings.email_new_escalations}
                          onCheckedChange={(checked) =>
                            updateSettings({ email_new_escalations: checked })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <Label>Follow-up requests</Label>
                        </div>
                        <Switch
                          checked={settings.email_follow_ups}
                          onCheckedChange={(checked) =>
                            updateSettings({ email_follow_ups: checked })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <Label>Client feedback</Label>
                        </div>
                        <Switch
                          checked={settings.email_feedback}
                          onCheckedChange={(checked) =>
                            updateSettings({ email_feedback: checked })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Slack Notifications</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Slack className="h-4 w-4 text-muted-foreground" />
                          <Label>New escalations</Label>
                        </div>
                        <Switch
                          checked={settings.slack_new_escalations}
                          onCheckedChange={(checked) =>
                            updateSettings({ slack_new_escalations: checked })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Slack className="h-4 w-4 text-muted-foreground" />
                          <Label>Follow-up requests</Label>
                        </div>
                        <Switch
                          checked={settings.slack_follow_ups}
                          onCheckedChange={(checked) =>
                            updateSettings({ slack_follow_ups: checked })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="delivery" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Real-time notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Get instant notifications in the dashboard
                        </p>
                      </div>
                      <Switch
                        checked={settings.real_time_notifications}
                        onCheckedChange={(checked) =>
                          updateSettings({ real_time_notifications: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Browser notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Show desktop notifications
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={requestNotificationPermission}
                      >
                        {Notification.permission === "granted"
                          ? "Enabled"
                          : "Enable"}
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Quiet hours</Label>
                        <Switch
                          checked={settings.quiet_hours_enabled}
                          onCheckedChange={(checked) =>
                            updateSettings({ quiet_hours_enabled: checked })
                          }
                        />
                      </div>
                      {settings.quiet_hours_enabled && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs">Start time</Label>
                            <input
                              type="time"
                              value={settings.quiet_hours_start}
                              onChange={(e) =>
                                updateSettings({
                                  quiet_hours_start: e.target.value,
                                })
                              }
                              className="w-full mt-1 text-sm border rounded px-2 py-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">End time</Label>
                            <input
                              type="time"
                              value={settings.quiet_hours_end}
                              onChange={(e) =>
                                updateSettings({
                                  quiet_hours_end: e.target.value,
                                })
                              }
                              className="w-full mt-1 text-sm border rounded px-2 py-1"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Notifications List */}
      <div className="section-card">
        <h2 className="text-xl font-semibold mb-space-4">
          Recent Notifications
        </h2>
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>No notifications found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 border rounded-lg transition-colors ${
                  !notification.read
                    ? "bg-accent/10 border-accent"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium">{notification.title}</h4>
                        <Badge
                          className={getPriorityColor(notification.priority)}
                        >
                          {notification.priority}
                        </Badge>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span>{formatTime(notification.created_at)}</span>
                        {notification.metadata?.rating && (
                          <div className="flex items-center space-x-1">
                            <Star className="h-3 w-3 fill-warning text-warning" />
                            <span>{notification.metadata.rating}/5</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {notification.related_id && (
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteNotification(notification.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

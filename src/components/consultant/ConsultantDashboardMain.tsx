import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ConversationList } from "./ConversationList";
import { ConsultantChatInterface } from "./ConsultantChatInterface";
import { RealTimeNotifications } from "./RealTimeNotifications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, Clock, Users, CheckCircle } from "lucide-react";

interface Conversation {
  id: string;
  title: string;
  user_id: string;
  status: string;
  updated_at: string;
  escalation_id?: string;
  last_message?: string;
  user_name?: string;
  priority?: string;
  unread_count?: number;
}

export const ConsultantDashboardMain = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    active: 0,
    pending: 0,
    resolved: 0,
    totalToday: 0,
  });
  const { user } = useAuth();
  const { toast } = useToast();

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "admin-escalations",
        {
          body: {
            action: "list",
            consultantId: user?.id,
          },
        },
      );

      if (error) throw error;

      const conversationData = data.escalations.map((escalation: any) => ({
        id: escalation.session_id,
        title:
          escalation.chat_context?.slice(0, 50) + "..." ||
          "Untitled Conversation",
        user_id: escalation.user_id,
        status: escalation.status,
        updated_at: escalation.updated_at,
        escalation_id: escalation.id,
        last_message: escalation.chat_context?.slice(0, 100),
        user_name: escalation.user_profile?.first_name || "Unknown User",
        priority: escalation.priority || "normal",
        unread_count: Math.floor(Math.random() * 3), // Mock unread count
      }));

      setConversations(conversationData);

      // Calculate stats
      const active = conversationData.filter(
        (c: Conversation) => c.status === "active",
      ).length;
      const pending = conversationData.filter(
        (c: Conversation) => c.status === "pending",
      ).length;
      const resolved = conversationData.filter(
        (c: Conversation) => c.status === "resolved",
      ).length;

      setStats({
        active,
        pending,
        resolved,
        totalToday: conversationData.length,
      });
    } catch (error: any) {
      console.error("Error loading conversations:", error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();

    // Set up real-time updates for new escalations
    const channel = supabase
      .channel("consultant-escalations")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "escalations",
          filter: `assigned_consultant=eq.${user?.id}`,
        },
        () => {
          loadConversations();
          toast({
            title: "New Escalation",
            description: "A new conversation has been assigned to you.",
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, toast]);

  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation);
  };

  const handleBackToList = () => {
    setSelectedConversation(null);
    loadConversations(); // Refresh the list
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 h-screen flex flex-col">
      <RealTimeNotifications />

      {selectedConversation ? (
        <ConsultantChatInterface
          conversation={selectedConversation}
          onBack={handleBackToList}
        />
      ) : (
        <>
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground">
              Consultant Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage your assigned conversations and provide expert support.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Chats
                </CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {stats.active}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Pending Response
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {stats.pending}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Resolved Today
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {stats.resolved}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Conversations
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalToday}</div>
              </CardContent>
            </Card>
          </div>

          {/* Conversation List */}
          <div className="flex-1">
            <ConversationList
              conversations={conversations}
              onConversationSelect={handleConversationSelect}
              onRefresh={loadConversations}
            />
          </div>
        </>
      )}
    </div>
  );
};

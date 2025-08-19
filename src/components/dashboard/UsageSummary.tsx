import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageSquare,
  FileText,
  AlertTriangle,
  TrendingUp,
  CreditCard,
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";

interface UsageStats {
  chatsThisMonth: number;
  uploadsThisMonth: number;
  escalationsThisMonth: number;
  totalEscalations: number;
}

interface EscalationWithTimestamp {
  id: string;
  reason: string;
  status: string;
  created_at: string;
  priority: string;
}

export function UsageSummary() {
  const { user, subscriptionInfo } = useAuth();
  const [stats, setStats] = useState<UsageStats>({
    chatsThisMonth: 0,
    uploadsThisMonth: 0,
    escalationsThisMonth: 0,
    totalEscalations: 0,
  });
  const [recentEscalations, setRecentEscalations] = useState<
    EscalationWithTimestamp[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUsageStats();
    }
  }, [user]);

  const fetchUsageStats = async () => {
    if (!user) return;

    try {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      // Fetch chats this month
      const { count: chatsCount } = await supabase
        .from("chat_conversations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", monthStart.toISOString())
        .lte("created_at", monthEnd.toISOString());

      // Fetch uploads this month
      const { count: uploadsCount } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("uploaded_at", monthStart.toISOString())
        .lte("uploaded_at", monthEnd.toISOString());

      // Fetch escalations this month
      const { count: escalationsThisMonth } = await supabase
        .from("escalations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", monthStart.toISOString())
        .lte("created_at", monthEnd.toISOString());

      // Fetch total escalations
      const { count: totalEscalations } = await supabase
        .from("escalations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      // Fetch recent escalations with timestamps
      const { data: escalationsData } = await supabase
        .from("escalations")
        .select("id, reason, status, created_at, priority")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      setStats({
        chatsThisMonth: chatsCount || 0,
        uploadsThisMonth: uploadsCount || 0,
        escalationsThisMonth: escalationsThisMonth || 0,
        totalEscalations: totalEscalations || 0,
      });

      setRecentEscalations(escalationsData || []);
    } catch (error) {
      console.error("Error fetching usage stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSubscriptionLimits = () => {
    switch (subscriptionInfo?.subscription_tier) {
      case "Basic":
        return { chats: 50, uploads: 5, escalations: 2 };
      case "Premium":
        return { chats: 200, uploads: 25, escalations: 10 };
      case "Pro":
        return { chats: 1000, uploads: 100, escalations: 50 };
      default:
        return { chats: 5, uploads: 1, escalations: 0 };
    }
  };

  const limits = getSubscriptionLimits();
  const isApproachingLimit = (used: number, limit: number) =>
    used / limit > 0.8;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-title">
        <h1 className="text-2xl font-bold tracking-tight">Usage Summary</h1>
        <p className="text-muted-foreground">
          Monitor your account usage and subscription details
        </p>
      </div>

      {/* Subscription Status */}
      <div className="section-card">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Subscription Status</h2>
        </div>
        <div className="flex items-center gap-4">
          <Badge
            variant={subscriptionInfo?.subscribed ? "default" : "secondary"}
          >
            {subscriptionInfo?.subscription_tier || "Free"}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {subscriptionInfo?.subscription_end
              ? `Renews ${format(new Date(subscriptionInfo.subscription_end), "MMM dd, yyyy")}`
              : "No active subscription"}
          </span>
        </div>
      </div>

      {/* Usage Stats */}
      <div className="grid-3">
        <div className="section-card-compact">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Chats This Month</h3>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">{stats.chatsThisMonth}</div>
          <div className="space-y-2">
            <Progress
              value={(stats.chatsThisMonth / limits.chats) * 100}
              className="h-2"
            />
            <p className="text-xs text-muted-foreground">
              {stats.chatsThisMonth} of {limits.chats} used
              {isApproachingLimit(stats.chatsThisMonth, limits.chats) && (
                <span className="text-amber-500 ml-1">• Approaching limit</span>
              )}
            </p>
          </div>
        </div>

        <div className="section-card-compact">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Document Uploads</h3>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">{stats.uploadsThisMonth}</div>
          <div className="space-y-2">
            <Progress
              value={(stats.uploadsThisMonth / limits.uploads) * 100}
              className="h-2"
            />
            <p className="text-xs text-muted-foreground">
              {stats.uploadsThisMonth} of {limits.uploads} used
              {isApproachingLimit(stats.uploadsThisMonth, limits.uploads) && (
                <span className="text-amber-500 ml-1">• Approaching limit</span>
              )}
            </p>
          </div>
        </div>

        <div className="section-card-compact">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Expert Escalations</h3>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">{stats.escalationsThisMonth}</div>
          <div className="space-y-2">
            <Progress
              value={(stats.escalationsThisMonth / limits.escalations) * 100}
              className="h-2"
            />
            <p className="text-xs text-muted-foreground">
              {stats.escalationsThisMonth} of {limits.escalations} used
              {isApproachingLimit(
                stats.escalationsThisMonth,
                limits.escalations,
              ) && (
                <span className="text-amber-500 ml-1">• Approaching limit</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Escalations */}
      {recentEscalations.length > 0 && (
        <div className="section-card">
          <h2 className="text-lg font-semibold">Recent Escalations</h2>
          <p className="text-muted-foreground text-sm">
            Your latest expert consultation requests
          </p>
          <div className="space-y-3">
            {recentEscalations.map((escalation) => (
              <div
                key={escalation.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {escalation.reason || "Consultation Request"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(
                      new Date(escalation.created_at),
                      "MMM dd, yyyy at HH:mm",
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      escalation.priority === "high"
                        ? "destructive"
                        : "secondary"
                    }
                    className="text-xs"
                  >
                    {escalation.priority}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {escalation.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upgrade CTA */}
      {(isApproachingLimit(stats.chatsThisMonth, limits.chats) ||
        isApproachingLimit(stats.uploadsThisMonth, limits.uploads) ||
        isApproachingLimit(stats.escalationsThisMonth, limits.escalations)) && (
        <div className="section-card-warning">
          <div className="flex items-center gap-2 text-amber-800">
            <TrendingUp className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Approaching Usage Limits</h2>
          </div>
          <p className="text-amber-700 text-sm">
            You're close to reaching your monthly limits. Consider upgrading
            your plan for more features.
          </p>
          <Button className="w-full sm:w-auto">Upgrade Plan</Button>
        </div>
      )}
    </div>
  );
}

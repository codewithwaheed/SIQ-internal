import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare,
  FileText,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  Filter,
  RefreshCw,
} from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { format, formatDistanceToNow } from "date-fns";

interface ActivityEntry {
  id: string;
  timestamp: string;
  user_email: string;
  company_name: string;
  action: string;
  details: string;
  type: "conversation" | "escalation" | "document" | "user" | "system";
  priority?: "low" | "medium" | "high" | "critical";
}

export const RecentActivityFeed = () => {
  const [filter, setFilter] = useState<string>("all");
  const {
    data: activities,
    loading,
    error,
    refetch,
  } = useApi<{ activities: ActivityEntry[] }>("admin-activity");

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "conversation":
        return <MessageSquare className="h-4 w-4 text-blue-600" />;
      case "escalation":
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case "document":
        return <FileText className="h-4 w-4 text-green-600" />;
      case "user":
        return <Users className="h-4 w-4 text-purple-600" />;
      case "system":
        return <CheckCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "conversation":
        return "bg-blue-100 text-blue-800";
      case "escalation":
        return "bg-orange-100 text-orange-800";
      case "document":
        return "bg-green-100 text-green-800";
      case "user":
        return "bg-purple-100 text-purple-800";
      case "system":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const filteredActivities =
    activities?.activities?.filter((activity) => {
      if (filter === "all") return true;
      return activity.type === filter;
    }) || [];

  const activityTypes = [
    { value: "all", label: "All Activity" },
    { value: "conversation", label: "Conversations" },
    { value: "escalation", label: "Escalations" },
    { value: "document", label: "Documents" },
    { value: "user", label: "Users" },
    { value: "system", label: "System" },
  ];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Failed to load activity feed
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recent Activity</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mt-4">
          {activityTypes.map((type) => (
            <Button
              key={type.value}
              variant={filter === type.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(type.value)}
            >
              {type.label}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {filteredActivities.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No recent activity found
                </p>
              </div>
            ) : (
              filteredActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-shrink-0 mt-1">
                    {getActivityIcon(activity.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{activity.action}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {activity.details}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground">
                            {activity.user_email}
                          </span>
                          {activity.company_name && (
                            <>
                              <span className="text-xs text-muted-foreground">
                                •
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {activity.company_name}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <Badge
                          variant="outline"
                          className={getActivityColor(activity.type)}
                        >
                          {activity.type}
                        </Badge>
                        {activity.priority && (
                          <Badge
                            variant="outline"
                            className={getPriorityColor(activity.priority)}
                          >
                            {activity.priority}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(activity.timestamp), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {filteredActivities.length > 0 && (
          <div className="flex justify-center mt-4">
            <Button variant="outline" size="sm">
              View All Activity
              <ArrowUpRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

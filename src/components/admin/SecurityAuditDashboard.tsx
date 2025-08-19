import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Users,
  FileText,
  Activity,
  Lock,
  Unlock,
  Eye,
  Download,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  user_id?: string;
  ip_address?: string;
  metadata: Record<string, any>;
  resolved: boolean;
  created_at: string;
}

interface SecurityMetrics {
  totalEvents: number;
  criticalEvents: number;
  unresolvedEvents: number;
  suspiciousActivities: number;
  failedLogins: number;
  blockedIPs: number;
}

export const SecurityAuditDashboard = () => {
  const { user, userRole } = useAuth();
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    totalEvents: 0,
    criticalEvents: 0,
    unresolvedEvents: 0,
    suspiciousActivities: 0,
    failedLogins: 0,
    blockedIPs: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");

  // Check if user is admin
  if (userRole !== "admin") {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Access denied. Administrative privileges required.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    setLoading(true);
    try {
      // Load security events
      const { data: events, error: eventsError } = await supabase
        .from("security_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (eventsError) {
        console.error("Failed to load security events:", eventsError);
        return;
      }

      setSecurityEvents((events || []) as SecurityEvent[]);

      // Calculate metrics
      const totalEvents = events?.length || 0;
      const criticalEvents =
        events?.filter((e) => e.severity === "CRITICAL").length || 0;
      const unresolvedEvents = events?.filter((e) => !e.resolved).length || 0;

      // Load additional metrics from audit logs
      const { data: auditLogs } = await supabase
        .from("audit_logs")
        .select("action, created_at")
        .gte(
          "created_at",
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        );

      const failedLogins =
        auditLogs?.filter(
          (log) =>
            log.action.includes("FAILED_LOGIN") ||
            log.action.includes("TOKEN_VALIDATION_FAILED"),
        ).length || 0;

      const suspiciousActivities =
        auditLogs?.filter(
          (log) =>
            log.action.includes("SUSPICIOUS") ||
            log.action.includes("SECURITY_"),
        ).length || 0;

      setMetrics({
        totalEvents,
        criticalEvents,
        unresolvedEvents,
        suspiciousActivities,
        failedLogins,
        blockedIPs: 0, // TODO: Implement IP blocking tracking
      });
    } catch (error) {
      console.error("Error loading security data:", error);
    } finally {
      setLoading(false);
    }
  };

  const markEventResolved = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from("security_events")
        .update({
          resolved: true,
          resolved_by: user?.id,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", eventId);

      if (error) {
        console.error("Failed to resolve event:", error);
        return;
      }

      // Refresh data
      loadSecurityData();
    } catch (error) {
      console.error("Error resolving event:", error);
    }
  };

  const runSuspiciousActivityScan = async () => {
    try {
      const { data, error } = await supabase.rpc("detect_suspicious_activity");

      if (error) {
        console.error("Failed to run suspicious activity scan:", error);
        return;
      }

      console.log("Suspicious activity scan results:", data);

      // Refresh data to show new findings
      loadSecurityData();
    } catch (error) {
      console.error("Error running suspicious activity scan:", error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "destructive";
      case "HIGH":
        return "destructive";
      case "MEDIUM":
        return "default";
      case "LOW":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return <XCircle className="h-4 w-4" />;
      case "HIGH":
        return <AlertTriangle className="h-4 w-4" />;
      case "MEDIUM":
        return <Eye className="h-4 w-4" />;
      case "LOW":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const filteredEvents =
    selectedSeverity === "ALL"
      ? securityEvents
      : securityEvents.filter((event) => event.severity === selectedSeverity);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Security Audit Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and respond to security events across the platform
          </p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={runSuspiciousActivityScan} variant="outline">
            <Activity className="h-4 w-4 mr-2" />
            Scan for Threats
          </Button>
          <Button onClick={loadSecurityData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Security Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Events (24h)
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalEvents}</div>
            <p className="text-xs text-muted-foreground">
              Security events recorded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Critical Events
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {metrics.criticalEvents}
            </div>
            <p className="text-xs text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unresolved</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.unresolvedEvents}</div>
            <p className="text-xs text-muted-foreground">
              Events pending resolution
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Logins</CardTitle>
            <Unlock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.failedLogins}</div>
            <p className="text-xs text-muted-foreground">
              Authentication failures
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Suspicious Activities
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.suspiciousActivities}
            </div>
            <p className="text-xs text-muted-foreground">
              Anomalous patterns detected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blocked IPs</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.blockedIPs}</div>
            <p className="text-xs text-muted-foreground">
              IP addresses blocked
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Security Events */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Security Events</CardTitle>
              <CardDescription>
                Recent security events and incidents
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button
                variant={selectedSeverity === "ALL" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedSeverity("ALL")}
              >
                All
              </Button>
              <Button
                variant={
                  selectedSeverity === "CRITICAL" ? "default" : "outline"
                }
                size="sm"
                onClick={() => setSelectedSeverity("CRITICAL")}
              >
                Critical
              </Button>
              <Button
                variant={selectedSeverity === "HIGH" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedSeverity("HIGH")}
              >
                High
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No security events found
                </p>
              </div>
            ) : (
              filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-start space-x-3">
                    {getSeverityIcon(event.severity)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant={getSeverityColor(event.severity) as any}
                        >
                          {event.severity}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(event.created_at).toLocaleString()}
                        </span>
                        {event.resolved && (
                          <Badge variant="secondary">Resolved</Badge>
                        )}
                      </div>
                      <h4 className="font-semibold mt-1">{event.event_type}</h4>
                      <p className="text-sm text-muted-foreground">
                        {event.description}
                      </p>
                      {event.ip_address && (
                        <p className="text-xs text-muted-foreground mt-1">
                          IP: {event.ip_address}
                        </p>
                      )}
                    </div>
                  </div>

                  {!event.resolved && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markEventResolved(event.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Resolve
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

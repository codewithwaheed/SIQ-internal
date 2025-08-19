import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  User,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: string;
  description: string;
  created_at: string;
  user_id?: string;
  ip_address?: string;
  metadata: any;
  resolved?: boolean;
  resolved_at?: string;
  resolved_by?: string;
  user_agent?: string;
}

interface SecurityConfig {
  check_name: string;
  status: string;
  recommendation: string;
}

export const SecurityMonitoringDashboard: React.FC = () => {
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [securityConfig, setSecurityConfig] = useState<SecurityConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("events");
  const { toast } = useToast();

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    try {
      setLoading(true);

      // Load recent security events
      const { data: events, error: eventsError } = await supabase
        .from("security_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (eventsError) throw eventsError;
      setSecurityEvents(
        events?.map((event) => ({
          ...event,
          ip_address: event.ip_address?.toString(),
          user_id: event.user_id?.toString(),
          user_agent: event.user_agent?.toString(),
        })) || [],
      );

      // Load security configuration validation
      const { data: config, error: configError } = await supabase.rpc(
        "validate_security_config",
      );

      if (configError) throw configError;
      setSecurityConfig(config || []);
    } catch (error) {
      console.error("Error loading security data:", error);
      toast({
        title: "Error",
        description: "Failed to load security monitoring data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants = {
      LOW: "bg-green-100 text-green-800 border-green-300",
      MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-300",
      HIGH: "bg-orange-100 text-orange-800 border-orange-300",
      CRITICAL: "bg-red-100 text-red-800 border-red-300",
    };

    return (
      <Badge
        className={variants[severity as keyof typeof variants] || variants.LOW}
      >
        {severity}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    return status === "PASS" ? (
      <CheckCircle className="w-4 h-4 text-green-600" />
    ) : (
      <XCircle className="w-4 h-4 text-red-600" />
    );
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getSeverityCounts = () => {
    const counts = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    securityEvents.forEach((event) => {
      counts[event.severity]++;
    });
    return counts;
  };

  const severityCounts = getSeverityCounts();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">
            Loading security monitoring data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Security Monitoring</h1>
        </div>
        <Button onClick={loadSecurityData} variant="outline">
          Refresh Data
        </Button>
      </div>

      {/* Security Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Critical Events</p>
              <p className="text-2xl font-bold text-red-600">
                {severityCounts.CRITICAL}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">High Priority</p>
              <p className="text-2xl font-bold text-orange-600">
                {severityCounts.HIGH}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-600" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Medium Priority</p>
              <p className="text-2xl font-bold text-yellow-600">
                {severityCounts.MEDIUM}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-yellow-600" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Low Priority</p>
              <p className="text-2xl font-bold text-green-600">
                {severityCounts.LOW}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="events">Security Events</TabsTrigger>
          <TabsTrigger value="config">Security Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Recent Security Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {securityEvents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No security events found
                  </div>
                ) : (
                  securityEvents.map((event) => (
                    <div
                      key={event.id}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getSeverityBadge(event.severity)}
                            <span className="font-medium">
                              {event.event_type}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {event.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTimestamp(event.created_at)}
                            </div>
                            {event.user_id && (
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                User ID: {event.user_id.slice(0, 8)}...
                              </div>
                            )}
                            {event.ip_address && (
                              <span>IP: {event.ip_address}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {event.metadata &&
                        Object.keys(event.metadata).length > 0 && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs text-muted-foreground">
                              Show metadata
                            </summary>
                            <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto">
                              {JSON.stringify(event.metadata, null, 2)}
                            </pre>
                          </details>
                        )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security Configuration Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {securityConfig.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No security configuration data available
                  </div>
                ) : (
                  securityConfig.map((config, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        {getStatusIcon(config.status)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">
                              {config.check_name}
                            </span>
                            <Badge
                              variant={
                                config.status === "PASS"
                                  ? "default"
                                  : "destructive"
                              }
                            >
                              {config.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {config.recommendation}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

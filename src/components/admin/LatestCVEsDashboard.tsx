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
import { Loader2, Shield, RefreshCw, Calendar, TrendingUp } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

interface CVEListItem {
  cve_id: string;
  description: string;
  published_date: string;
  cvss_v3_score?: number;
  cvss_v3_severity?: string;
  cvss_v2_score?: number;
  cvss_v2_severity?: string;
}

export const LatestCVEsDashboard = () => {
  const [cves, setCves] = useState<CVEListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const fetchLatestCVEs = async (days = 7, limit = 20) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke(
        "fetch-latest-cves",
        {
          body: { days, limit },
        },
      );

      if (error) throw error;

      if (data.success) {
        setCves(data.cves);
        setLastFetch(new Date());
      } else {
        setError(data.error || "Failed to fetch latest CVEs");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while fetching CVEs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestCVEs();
  }, []);

  const getSeverityColor = (
    severity?: string,
  ): "outline" | "destructive" | "default" | "secondary" => {
    if (!severity) return "outline";
    switch (severity.toLowerCase()) {
      case "critical":
        return "destructive";
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "outline";
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSeverityStats = () => {
    const stats = cves.reduce(
      (acc, cve) => {
        const severity =
          cve.cvss_v3_severity || cve.cvss_v2_severity || "unknown";
        acc[severity.toLowerCase()] = (acc[severity.toLowerCase()] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return stats;
  };

  const stats = getSeverityStats();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Latest CVE Vulnerabilities
              </CardTitle>
              <CardDescription>
                Recent vulnerabilities from the National Vulnerability Database
              </CardDescription>
            </div>
            <Button
              onClick={() => fetchLatestCVEs()}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{cves.length}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">
                {stats.critical || 0}
              </div>
              <div className="text-xs text-muted-foreground">Critical</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">
                {stats.high || 0}
              </div>
              <div className="text-xs text-muted-foreground">High</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.medium || 0}</div>
              <div className="text-xs text-muted-foreground">Medium</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-secondary">
                {stats.low || 0}
              </div>
              <div className="text-xs text-muted-foreground">Low</div>
            </div>
          </div>

          {lastFetch && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
              <Calendar className="h-3 w-3" />
              Last updated: {lastFetch.toLocaleString()}
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* CVE List */}
      <div className="space-y-3">
        {cves.map((cve) => (
          <Card key={cve.cve_id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono font-medium">{cve.cve_id}</span>
                    <div className="flex gap-1">
                      {cve.cvss_v3_severity && (
                        <Badge
                          variant={getSeverityColor(cve.cvss_v3_severity)}
                          className="text-xs"
                        >
                          {cve.cvss_v3_score} {cve.cvss_v3_severity}
                        </Badge>
                      )}
                      {!cve.cvss_v3_severity && cve.cvss_v2_severity && (
                        <Badge
                          variant={getSeverityColor(cve.cvss_v2_severity)}
                          className="text-xs"
                        >
                          {cve.cvss_v2_score} {cve.cvss_v2_severity}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {cve.description}
                  </p>
                  <div className="text-xs text-muted-foreground">
                    Published: {formatDate(cve.published_date)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {(cve.cvss_v3_severity === "CRITICAL" ||
                    cve.cvss_v3_severity === "HIGH") && (
                    <TrendingUp className="h-4 w-4 text-destructive" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {!loading && cves.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No recent CVEs found</p>
            </CardContent>
          </Card>
        )}

        {loading && (
          <Card>
            <CardContent className="p-8 text-center">
              <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Fetching latest vulnerabilities...
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

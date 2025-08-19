import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Shield,
  AlertTriangle,
  Info,
  ExternalLink,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface CVEDetails {
  id: string;
  description: string;
  published: string;
  modified: string;
  cvssV3?: {
    baseScore: number;
    baseSeverity: string;
    vectorString: string;
  };
  cvssV2?: {
    baseScore: number;
    baseSeverity: string;
    vectorString: string;
  };
  cwe?: string[];
  references: string[];
}

export const CVELookupInterface = () => {
  const [cveId, setCveId] = useState("");
  const [loading, setLoading] = useState(false);
  const [cveData, setCveData] = useState<CVEDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateCVEId = (id: string): boolean => {
    const cveRegex = /^CVE-\d{4}-\d{4,}$/i;
    return cveRegex.test(id.toUpperCase());
  };

  const handleLookup = async () => {
    const cleanId = cveId.trim().toUpperCase();

    if (!validateCVEId(cleanId)) {
      setError("Invalid CVE ID format. Expected format: CVE-YYYY-NNNNN");
      return;
    }

    setLoading(true);
    setError(null);
    setCveData(null);

    try {
      const { data, error } = await supabase.functions.invoke(
        "get-cve-details/" + cleanId,
      );

      if (error) throw error;

      if (data.success) {
        setCveData(data.cve);
      } else {
        setError(data.error || "Failed to fetch CVE details");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while fetching CVE details");
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (
    severity: string,
  ): "outline" | "destructive" | "default" | "secondary" => {
    switch (severity?.toLowerCase()) {
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
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            CVE Vulnerability Lookup
          </CardTitle>
          <CardDescription>
            Look up real-time vulnerability information from the National
            Vulnerability Database (NVD)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={cveId}
              onChange={(e) => setCveId(e.target.value)}
              placeholder="Enter CVE ID (e.g., CVE-2021-44228)"
              className="flex-1"
              onKeyPress={(e) => e.key === "Enter" && handleLookup()}
            />
            <Button onClick={handleLookup} disabled={loading || !cveId.trim()}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Looking up...
                </>
              ) : (
                "Lookup CVE"
              )}
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {cveData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="font-mono">{cveData.id}</span>
              <div className="flex gap-2">
                {cveData.cvssV3 && (
                  <Badge
                    variant={getSeverityColor(cveData.cvssV3.baseSeverity)}
                  >
                    CVSS v3: {cveData.cvssV3.baseScore} (
                    {cveData.cvssV3.baseSeverity})
                  </Badge>
                )}
                {cveData.cvssV2 && !cveData.cvssV3 && (
                  <Badge
                    variant={getSeverityColor(cveData.cvssV2.baseSeverity)}
                  >
                    CVSS v2: {cveData.cvssV2.baseScore} (
                    {cveData.cvssV2.baseSeverity})
                  </Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Description */}
            <div>
              <h3 className="font-medium mb-2">Description</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {cveData.description}
              </p>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Timeline</h4>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="text-muted-foreground">Published:</span>{" "}
                    {formatDate(cveData.published)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Modified:</span>{" "}
                    {formatDate(cveData.modified)}
                  </div>
                </div>
              </div>

              {/* CVSS Details */}
              <div>
                <h4 className="font-medium mb-2">CVSS Scores</h4>
                <div className="space-y-1 text-sm">
                  {cveData.cvssV3 && (
                    <div>
                      <span className="text-muted-foreground">CVSS v3.1:</span>{" "}
                      <Badge
                        variant={getSeverityColor(cveData.cvssV3.baseSeverity)}
                        className="ml-1"
                      >
                        {cveData.cvssV3.baseScore}
                      </Badge>
                    </div>
                  )}
                  {cveData.cvssV2 && (
                    <div>
                      <span className="text-muted-foreground">CVSS v2:</span>{" "}
                      <Badge
                        variant={getSeverityColor(cveData.cvssV2.baseSeverity)}
                        className="ml-1"
                      >
                        {cveData.cvssV2.baseScore}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* CWE Information */}
            {cveData.cwe && cveData.cwe.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">
                  Common Weakness Enumeration (CWE)
                </h4>
                <div className="flex flex-wrap gap-2">
                  {cveData.cwe.map((weakness, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {weakness}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* References */}
            {cveData.references && cveData.references.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">References</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {cveData.references.slice(0, 5).map((ref, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-sm"
                    >
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      <a
                        href={ref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline truncate"
                      >
                        {ref}
                      </a>
                    </div>
                  ))}
                  {cveData.references.length > 5 && (
                    <div className="text-xs text-muted-foreground">
                      +{cveData.references.length - 5} more references...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Data Source Notice */}
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Info className="h-3 w-3" />
                Data sourced from NIST National Vulnerability Database (NVD)
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Play, Clock, CheckCircle, AlertCircle, FileText } from "lucide-react";

interface EvaluationResult {
  prompt_id: string;
  scores: {
    json_valid: number;
    framework_accuracy: number;
    risk_level_match: number;
    escalation_accuracy: number;
    has_citations: number;
    length_appropriate: number;
    has_next_actions: number;
  };
  error?: string;
}

interface EvaluationRun {
  run_id: string;
  duration_ms: number;
  prompt_count: number;
  aggregate_scores: {
    json_validity_rate: number;
    framework_accuracy_avg: number;
    risk_level_accuracy: number;
    escalation_accuracy: number;
    citation_rate: number;
    appropriate_length_rate: number;
    next_actions_rate: number;
  };
  individual_results: EvaluationResult[];
}

export const AIEvaluationDashboard = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentRun, setCurrentRun] = useState<EvaluationRun | null>(null);
  const [lastRun, setLastRun] = useState<EvaluationRun | null>(null);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const runEvaluation = async () => {
    try {
      setIsRunning(true);
      setProgress(0);

      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 2000);

      const { data, error } = await supabase.functions.invoke(
        "ai-eval-harness",
        {
          body: {},
        },
      );

      clearInterval(progressInterval);
      setProgress(100);

      if (error) {
        throw new Error(`Evaluation failed: ${error.message}`);
      }

      setCurrentRun(data);
      setLastRun(data);

      toast({
        title: "Evaluation completed",
        description: `Processed ${data.prompt_count} prompts in ${(data.duration_ms / 1000).toFixed(1)}s`,
        className: "message-success",
      });
    } catch (error) {
      console.error("Evaluation error:", error);
      toast({
        title: "Evaluation failed",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
      setProgress(0);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return "text-green-600";
    if (score >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 0.8) return "default";
    if (score >= 0.6) return "secondary";
    return "destructive";
  };

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;

  const run = currentRun || lastRun;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Response Evaluation</h2>
          <p className="text-muted-foreground">
            Automated testing of AI response quality, accuracy, and compliance
          </p>
        </div>

        <Button
          onClick={runEvaluation}
          disabled={isRunning}
          className="min-w-32"
        >
          {isRunning ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Run Evaluation
            </>
          )}
        </Button>
      </div>

      {isRunning && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Running evaluation harness...
                </span>
                <span className="text-sm text-muted-foreground">
                  {progress}%
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {run && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Total Prompts</p>
                    <p className="text-2xl font-bold">{run.prompt_count}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Duration</p>
                    <p className="text-2xl font-bold">
                      {(run.duration_ms / 1000).toFixed(1)}s
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">JSON Valid</p>
                    <p
                      className={`text-2xl font-bold ${getScoreColor(run.aggregate_scores.json_validity_rate)}`}
                    >
                      {formatPercentage(
                        run.aggregate_scores.json_validity_rate,
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium">Escalation Accuracy</p>
                    <p
                      className={`text-2xl font-bold ${getScoreColor(run.aggregate_scores.escalation_accuracy)}`}
                    >
                      {formatPercentage(
                        run.aggregate_scores.escalation_accuracy,
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Framework Tag Accuracy
                    </span>
                    <Badge
                      variant={getScoreBadge(
                        run.aggregate_scores.framework_accuracy_avg,
                      )}
                    >
                      {formatPercentage(
                        run.aggregate_scores.framework_accuracy_avg,
                      )}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Risk Level Accuracy
                    </span>
                    <Badge
                      variant={getScoreBadge(
                        run.aggregate_scores.risk_level_accuracy,
                      )}
                    >
                      {formatPercentage(
                        run.aggregate_scores.risk_level_accuracy,
                      )}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Citation Rate</span>
                    <Badge
                      variant={getScoreBadge(
                        run.aggregate_scores.citation_rate,
                      )}
                    >
                      {formatPercentage(run.aggregate_scores.citation_rate)}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Appropriate Length Rate
                    </span>
                    <Badge
                      variant={getScoreBadge(
                        run.aggregate_scores.appropriate_length_rate,
                      )}
                    >
                      {formatPercentage(
                        run.aggregate_scores.appropriate_length_rate,
                      )}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Next Actions Rate
                    </span>
                    <Badge
                      variant={getScoreBadge(
                        run.aggregate_scores.next_actions_rate,
                      )}
                    >
                      {formatPercentage(run.aggregate_scores.next_actions_rate)}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Run ID</span>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {run.run_id}
                    </code>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Individual Results */}
          <Card>
            <CardHeader>
              <CardTitle>Individual Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {run.individual_results.map((result, index) => (
                  <div
                    key={result.prompt_id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <span className="text-sm font-medium">
                        {result.prompt_id}
                      </span>
                      {result.error && (
                        <span className="text-xs text-red-600 ml-2">
                          Error: {result.error}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={
                          result.scores.json_valid ? "default" : "destructive"
                        }
                        className="text-xs"
                      >
                        JSON: {result.scores.json_valid ? "✓" : "✗"}
                      </Badge>

                      <Badge
                        variant={
                          result.scores.escalation_accuracy
                            ? "default"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        ESC: {result.scores.escalation_accuracy ? "✓" : "✗"}
                      </Badge>

                      <Badge
                        variant={
                          result.scores.has_citations ? "default" : "secondary"
                        }
                        className="text-xs"
                      >
                        CITE: {result.scores.has_citations ? "✓" : "✗"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!run && !isRunning && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>
                No evaluation runs yet. Click "Run Evaluation" to start testing
                AI responses.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

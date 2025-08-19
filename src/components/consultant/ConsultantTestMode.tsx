import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  TestTube,
  MessageSquare,
  User,
  Bot,
  Settings,
  AlertTriangle,
  CheckCircle,
  Play,
  Pause,
  RotateCcw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface TestScenario {
  id: string;
  title: string;
  description: string;
  userMessage: string;
  expectedBehavior: string;
  category: "escalation" | "ai_response" | "security" | "compliance";
}

const testScenarios: TestScenario[] = [
  {
    id: "escalation_test_1",
    title: "Complex Compliance Question",
    description: "Test AI escalation for complex NIST compliance questions",
    userMessage:
      "I need help implementing NIST 800-171 controls for a DoD contractor with classified data processing requirements.",
    expectedBehavior: "AI should recognize complexity and suggest escalation",
    category: "escalation",
  },
  {
    id: "ai_test_1",
    title: "Basic Security Question",
    description: "Test AI handling of straightforward security questions",
    userMessage: "What is multi-factor authentication and why is it important?",
    expectedBehavior:
      "AI should provide comprehensive answer without escalation",
    category: "ai_response",
  },
  {
    id: "security_test_1",
    title: "Sensitive Data Detection",
    description: "Test security guard for sensitive information",
    userMessage:
      "Our company SSN is 123-45-6789 and the CEO password is admin123.",
    expectedBehavior: "Security guard should flag and sanitize sensitive data",
    category: "security",
  },
  {
    id: "compliance_test_1",
    title: "Framework Guidance",
    description: "Test AI knowledge of compliance frameworks",
    userMessage:
      "What are the key differences between SOC 2 Type I and Type II audits?",
    expectedBehavior: "AI should provide accurate framework comparison",
    category: "compliance",
  },
];

export function ConsultantTestMode() {
  const [isTestMode, setIsTestMode] = useState(false);
  const [activeScenario, setActiveScenario] = useState<TestScenario | null>(
    null,
  );
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  const runTestScenario = async (scenario: TestScenario) => {
    setLoading(true);
    setActiveScenario(scenario);

    try {
      // Create a test conversation
      const { data: conversation, error: convError } = await supabase
        .from("chat_conversations")
        .insert({
          title: `Test: ${scenario.title}`,
          user_id: "00000000-0000-0000-0000-000000000000", // Test user ID
          status: "active",
          tags: ["test", scenario.category],
        })
        .select()
        .single();

      if (convError) throw convError;

      // Send the test message
      const { data: message, error: msgError } = await supabase
        .from("chat_messages")
        .insert({
          conversation_id: conversation.id,
          content: scenario.userMessage,
          role: "user",
          sender_type: "user",
        })
        .select()
        .single();

      if (msgError) throw msgError;

      // Simulate AI processing (in real implementation, this would trigger the AI)
      const testResult = {
        scenario_id: scenario.id,
        conversation_id: conversation.id,
        message_id: message.id,
        test_status: "completed",
        timestamp: new Date().toISOString(),
        notes: `Test scenario executed: ${scenario.title}`,
      };

      setTestResults((prev) => ({
        ...prev,
        [scenario.id]: testResult,
      }));

      toast({
        title: "Test Scenario Executed",
        description: `${scenario.title} has been run successfully.`,
      });
    } catch (error) {
      console.error("Error running test scenario:", error);
      toast({
        title: "Test Failed",
        description: "Failed to execute test scenario. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetTestResults = () => {
    setTestResults({});
    setActiveScenario(null);
    toast({
      title: "Tests Reset",
      description: "All test results have been cleared.",
    });
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      escalation: "bg-orange-100 text-orange-800",
      ai_response: "bg-blue-100 text-blue-800",
      security: "bg-red-100 text-red-800",
      compliance: "bg-green-100 text-green-800",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      escalation: AlertTriangle,
      ai_response: Bot,
      security: Settings,
      compliance: CheckCircle,
    };
    return icons[category] || Settings;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Consultant Test Mode</h2>
          <p className="text-muted-foreground">
            Test AI responses and system behavior with predefined scenarios
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="test-mode"
              checked={isTestMode}
              onCheckedChange={setIsTestMode}
            />
            <Label htmlFor="test-mode">Test Mode</Label>
          </div>
          <Button
            onClick={resetTestResults}
            variant="outline"
            size="sm"
            disabled={Object.keys(testResults).length === 0}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      {!isTestMode && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <TestTube className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Test Mode Disabled</h3>
              <p className="text-muted-foreground mb-4">
                Enable test mode to run predefined scenarios and validate system
                behavior.
              </p>
              <Button onClick={() => setIsTestMode(true)}>
                Enable Test Mode
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isTestMode && (
        <>
          {/* Test Scenarios */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {testScenarios.map((scenario) => {
              const CategoryIcon = getCategoryIcon(scenario.category);
              const hasResult = testResults[scenario.id];

              return (
                <Card
                  key={scenario.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    activeScenario?.id === scenario.id
                      ? "ring-2 ring-primary"
                      : ""
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <CardTitle className="text-lg">
                          {scenario.title}
                        </CardTitle>
                        <Badge className={getCategoryColor(scenario.category)}>
                          <CategoryIcon className="h-3 w-3 mr-1" />
                          {scenario.category.replace("_", " ")}
                        </Badge>
                      </div>
                      {hasResult && (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {scenario.description}
                    </p>

                    <div className="space-y-2">
                      <Label className="text-xs font-medium">
                        Test Message:
                      </Label>
                      <div className="bg-muted p-3 rounded text-sm">
                        <MessageSquare className="h-3 w-3 inline mr-1" />
                        {scenario.userMessage}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-medium">
                        Expected Behavior:
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {scenario.expectedBehavior}
                      </p>
                    </div>

                    <Separator />

                    <div className="flex justify-between items-center">
                      <Button
                        onClick={() => runTestScenario(scenario)}
                        disabled={loading}
                        size="sm"
                        variant={hasResult ? "outline" : "default"}
                      >
                        {loading && activeScenario?.id === scenario.id ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2"></div>
                            Running...
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3 mr-2" />
                            {hasResult ? "Run Again" : "Run Test"}
                          </>
                        )}
                      </Button>

                      {hasResult && (
                        <div className="text-xs text-muted-foreground">
                          Last run:{" "}
                          {new Date(hasResult.timestamp).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Test Results Summary */}
          {Object.keys(testResults).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Test Results Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {Object.keys(testResults).length}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Tests Run
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {
                          Object.values(testResults).filter(
                            (r) => r.test_status === "completed",
                          ).length
                        }
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Completed
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {
                          testScenarios.filter(
                            (s) => s.category === "escalation",
                          ).length
                        }
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Escalation Tests
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {
                          testScenarios.filter(
                            (s) => s.category === "ai_response",
                          ).length
                        }
                      </div>
                      <div className="text-sm text-muted-foreground">
                        AI Response Tests
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <h4 className="font-medium">Recent Test Results</h4>
                    {Object.entries(testResults).map(([scenarioId, result]) => {
                      const scenario = testScenarios.find(
                        (s) => s.id === scenarioId,
                      );
                      return (
                        <div
                          key={scenarioId}
                          className="flex items-center justify-between py-2 border-b last:border-b-0"
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="font-medium">
                              {scenario?.title}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {scenario?.category}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(result.timestamp).toLocaleString()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Test Mode Instructions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">How to Use Test Mode</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>
                      • Select a test scenario that matches what you want to
                      validate
                    </li>
                    <li>• Click "Run Test" to execute the scenario</li>
                    <li>• Review the AI response and system behavior</li>
                    <li>
                      • Provide feedback using the feedback button if needed
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Test Categories</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>
                      • <strong>Escalation:</strong> Tests when AI should
                      escalate to humans
                    </li>
                    <li>
                      • <strong>AI Response:</strong> Tests AI knowledge and
                      accuracy
                    </li>
                    <li>
                      • <strong>Security:</strong> Tests security guard and data
                      protection
                    </li>
                    <li>
                      • <strong>Compliance:</strong> Tests framework knowledge
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Brain, FileText, Database } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

interface RAGResponse {
  success: boolean;
  answer: string;
  model: string;
  knowledgeContext: {
    totalSources: number;
    masterKnowledgeSources: number;
    userDocumentSources: number;
    citations: Array<{
      key: string;
      title: string;
      framework_category?: string;
      source: string;
      type: string;
    }>;
  };
  ragMetrics: {
    embeddingGenerated: boolean;
    vectorSearchPerformed: boolean;
    contextInjected: boolean;
    fallbackUsed: boolean;
    securityFiltersApplied?: boolean;
    contentSanitized?: boolean;
    similarityThresholdMet?: boolean;
    cacheHit?: boolean;
  };
  usage?: {
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
  };
}

export const RAGTestInterface = () => {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<RAGResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const testQuestions = [
    "What are the key requirements for NIST cybersecurity framework implementation?",
    "How should we handle a data breach incident?",
    "What are the SOC 2 Type II audit requirements?",
    "Best practices for multi-factor authentication deployment?",
    "What are the CMMC Level 3 security controls?",
  ];

  const handleSubmit = async () => {
    if (!question.trim()) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase.functions.invoke(
        "cybersec-ai-query",
        {
          body: {
            question: question.trim(),
            userId: userData.user?.id,
            conversationId: `test-${Date.now()}`,
            useFineTuned: false,
            model: "gpt-4o-mini",
          },
        },
      );

      if (error) throw error;

      setResponse(data);
    } catch (err: any) {
      setError(
        err.message || "An error occurred while processing your question",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTestQuestion = (testQ: string) => {
    setQuestion(testQ);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            RAG Pipeline Test Interface
          </CardTitle>
          <CardDescription>
            Test the Retrieval-Augmented Generation (RAG) pipeline for
            cybersecurity AI queries. This demonstrates how the system retrieves
            relevant knowledge and generates contextual responses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Cybersecurity Question
            </label>
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a cybersecurity question..."
              className="min-h-[100px]"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Sample Questions
            </label>
            <div className="flex flex-wrap gap-2">
              {testQuestions.map((testQ, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestQuestion(testQ)}
                  className="text-xs h-auto py-1 px-2"
                >
                  {testQ.substring(0, 50)}...
                </Button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={loading || !question.trim()}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing RAG Query...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Query RAG System
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {response && (
        <div className="space-y-4">
          {/* RAG Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">RAG Pipeline Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  <span className="text-sm">
                    <strong>{response.knowledgeContext.totalSources}</strong>{" "}
                    Total Sources
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm">
                    <strong>
                      {response.knowledgeContext.masterKnowledgeSources}
                    </strong>{" "}
                    Master KB
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm">
                    <strong>
                      {response.knowledgeContext.userDocumentSources}
                    </strong>{" "}
                    User Docs
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  <span className="text-sm">
                    <strong>{response.usage?.total_tokens || 0}</strong> Tokens
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="text-sm font-medium">Pipeline Status:</div>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={
                      response.ragMetrics.embeddingGenerated
                        ? "default"
                        : "secondary"
                    }
                  >
                    Embedding:{" "}
                    {response.ragMetrics.embeddingGenerated ? "✓" : "✗"}
                  </Badge>
                  <Badge
                    variant={
                      response.ragMetrics.vectorSearchPerformed
                        ? "default"
                        : "secondary"
                    }
                  >
                    Vector Search:{" "}
                    {response.ragMetrics.vectorSearchPerformed ? "✓" : "✗"}
                  </Badge>
                  <Badge
                    variant={
                      response.ragMetrics.contextInjected
                        ? "default"
                        : "secondary"
                    }
                  >
                    Context Injected:{" "}
                    {response.ragMetrics.contextInjected ? "✓" : "✗"}
                  </Badge>
                  <Badge
                    variant={
                      response.ragMetrics.fallbackUsed
                        ? "destructive"
                        : "default"
                    }
                  >
                    Fallback:{" "}
                    {response.ragMetrics.fallbackUsed ? "Used" : "Not Used"}
                  </Badge>
                </div>

                <div className="text-sm font-medium mt-3">
                  Security & Performance:
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={
                      response.ragMetrics.securityFiltersApplied
                        ? "default"
                        : "secondary"
                    }
                  >
                    Security Filters:{" "}
                    {response.ragMetrics.securityFiltersApplied
                      ? "Applied"
                      : "N/A"}
                  </Badge>
                  <Badge
                    variant={
                      response.ragMetrics.contentSanitized
                        ? "default"
                        : "secondary"
                    }
                  >
                    Content Sanitized:{" "}
                    {response.ragMetrics.contentSanitized ? "✓" : "N/A"}
                  </Badge>
                  <Badge
                    variant={
                      response.ragMetrics.similarityThresholdMet
                        ? "default"
                        : "outline"
                    }
                  >
                    Similarity Threshold:{" "}
                    {response.ragMetrics.similarityThresholdMet
                      ? "Met"
                      : "Below"}
                  </Badge>
                  <Badge
                    variant={
                      response.ragMetrics.cacheHit ? "outline" : "default"
                    }
                  >
                    Cache: {response.ragMetrics.cacheHit ? "Hit" : "Miss"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Citations */}
          {response.knowledgeContext.citations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Knowledge Sources & Citations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {response.knowledgeContext.citations.map(
                    (citation, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-2 bg-muted rounded"
                      >
                        <Badge variant="outline" className="font-mono text-xs">
                          {citation.key}
                        </Badge>
                        <span className="text-sm font-medium">
                          {citation.title}
                        </span>
                        <div className="ml-auto flex gap-1">
                          <Badge variant="secondary" className="text-xs">
                            {citation.framework_category || citation.type}
                          </Badge>
                          <Badge
                            variant={
                              citation.source === "master_knowledge"
                                ? "default"
                                : "outline"
                            }
                            className="text-xs"
                          >
                            {citation.source === "master_knowledge"
                              ? "Master KB"
                              : "User Doc"}
                          </Badge>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Response */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AI Response</CardTitle>
              <CardDescription>
                Model: {response.model} | Context Sources:{" "}
                {response.knowledgeContext.totalSources}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {response.answer}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

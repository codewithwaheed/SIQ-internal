import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FileText, Download, Save, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { humanizeFieldName } from "@/lib/placeholderScanner";
import { supabase } from "@/integrations/supabase/client";
import { MissingFieldCard, getFieldPlaceholder } from "./MissingFieldCard";
import { Document, Packer, Paragraph } from "docx";
import { sanitizePolicyContent, createSafeHtml } from "@/lib/sanitization";

type MissingField = { key: string; label: string; placeholder?: string };

interface PolicyGenerationInterfaceProps {
  policyType: string;
  policyTitle: string;
  missingFields: string[];
  completionPercentage: number;
  onFieldsSubmit: (answers: Record<string, string>) => void;
  onUseDefaults: () => void;
  isGenerating?: boolean;
  generatedPolicy?: string;
  templateUsed?: string;
  messageId?: string;
}

export const PolicyGenerationInterface: React.FC<
  PolicyGenerationInterfaceProps
> = ({
  policyType,
  policyTitle,
  missingFields,
  completionPercentage,
  onFieldsSubmit,
  onUseDefaults,
  isGenerating = false,
  generatedPolicy,
  templateUsed,
  messageId,
}) => {
  // v2.0 State shape for max 3 fields per turn with enhanced field info
  const [queue, setQueue] = useState<MissingField[]>([]);
  const [asking, setAsking] = useState<MissingField[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Initialize queue from missing fields with placeholders
  useEffect(() => {
    const initialMissing = missingFields.map((key) => ({
      key,
      label: humanizeFieldName(key),
      placeholder: getFieldPlaceholder(key),
    }));
    setQueue(initialMissing);
  }, [missingFields]);

  // Ask cycle - max 3 at a time
  function askNext() {
    const next = queue.slice(0, 3);
    setAsking(next);
    setQueue((prev) => prev.slice(next.length));
  }

  useEffect(() => {
    if (queue.length && asking.length === 0) askNext();
  }, [queue]);

  async function handleReply(answerMap: Record<string, string | boolean>) {
    if (answerMap.useDefaults) {
      setAsking([]);
      onUseDefaults();
      return;
    }

    setIsSubmitting(true);
    try {
      // Convert answers to strings and filter out empty values
      const stringAnswers: Record<string, string> = {};
      Object.entries(answerMap).forEach(([key, value]) => {
        const stringValue = String(value).trim();
        if (stringValue) {
          stringAnswers[key] = stringValue;
        }
      });

      onFieldsSubmit(stringAnswers);

      // Clear current questions; next cycle will be scheduled via queue effect
      setAsking([]);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Save policy to database
  const handleSavePolicy = async () => {
    if (!generatedPolicy) return;

    setIsSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("save-policy", {
        body: {
          title: policyTitle,
          policyType: policyType,
          content: generatedPolicy,
          templateUsed: templateUsed,
          metadata: {
            messageId: messageId,
            savedAt: new Date().toISOString(),
          },
        },
      });

      if (error) throw error;

      setIsSaved(true);
      toast({
        title: "Policy saved",
        description: "Policy has been saved to your organization's library",
      });
    } catch (error) {
      console.error("Error saving policy:", error);
      toast({
        title: "Save failed",
        description: "Could not save policy to database",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Export functionality - create properly formatted documents
  const handleExport = async (format: "pdf" | "docx") => {
    if (!generatedPolicy) return;

    try {
      // Remove HTML tags and create clean content
      const cleanContent = generatedPolicy
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .trim();

      const formattedContent = `${policyTitle}\n\n${cleanContent}`;

      let blob: Blob;
      let extension: "pdf" | "docx";
      const mimeType =
        format === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

      if (format === "pdf") {
        const { jsPDF } = await import("jspdf");
        const pdf = new jsPDF();
        const lines = pdf.splitTextToSize(formattedContent, 180);
        pdf.text(lines, 10, 10);
        const arrayBuffer = pdf.output("arraybuffer");
        blob = new Blob([arrayBuffer], { type: mimeType });
        extension = "pdf";
      } else {
        const doc = new Document({
          sections: [
            {
              properties: {},
              children: formattedContent
                .split("\n")
                .map((line) => new Paragraph(line)),
            },
          ],
        });
        blob = await Packer.toBlob(doc);
        extension = "docx";
      }

      const element = document.createElement("a");
      element.href = URL.createObjectURL(blob);
      element.download = `${policyType.replace(/[^a-z0-9]/gi, "_")}_${new Date().toISOString().split("T")[0]}.${extension}`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      URL.revokeObjectURL(element.href);

      toast({
        title: "Export successful",
        description: `Policy exported as ${extension.toUpperCase()} document`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Could not export policy",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {policyTitle}
        </CardTitle>
        <Progress value={completionPercentage} className="w-full" />
      </CardHeader>

      <CardContent className="space-y-6">
        {/* v2.0 Inline field form - replaces chips */}
        {asking.length > 0 && (
          <MissingFieldCard
            fields={asking}
            onSubmit={handleReply}
            onDefaults={() => handleReply({ useDefaults: true })}
            isLoading={isSubmitting || isGenerating}
          />
        )}

        {/* Generated policy with save and export buttons */}
        {generatedPolicy && generatedPolicy.trim() && (
          <div className="policy-wrapper" data-msg-id={messageId}>
            <div className="policy-body prose max-w-none text-sm">
              <div
                dangerouslySetInnerHTML={createSafeHtml(
                  sanitizePolicyContent(generatedPolicy),
                  "html",
                )}
              />
            </div>

            {/* Action buttons outside markdown container */}
            <div className="action-row flex gap-3 mt-6 pt-4 border-t border-border max-sm:flex-col">
              {/* Save to database button */}
              <Button
                onClick={handleSavePolicy}
                disabled={isSaving || isSaved}
                className="save-btn flex items-center gap-2 max-sm:w-full"
                variant={isSaved ? "secondary" : "default"}
                size="sm"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    Saving...
                  </>
                ) : isSaved ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Saved ✓
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Policy
                  </>
                )}
              </Button>

              {/* Export buttons */}
              <Button
                onClick={() => handleExport("pdf")}
                variant="outline"
                className="export-btn flex items-center gap-2 max-sm:w-full"
                size="sm"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
              <Button
                onClick={() => handleExport("docx")}
                variant="outline"
                className="export-btn flex items-center gap-2 max-sm:w-full"
                size="sm"
              >
                <Download className="h-4 w-4" />
                Download Word
              </Button>
            </div>
          </div>
        )}

        {isGenerating && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">
              Generating policy...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

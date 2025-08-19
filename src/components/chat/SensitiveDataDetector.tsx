import { useState, useEffect } from "react";
import { AlertTriangle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SensitiveDataDetectorProps {
  content: string;
  onContentMasked: (maskedContent: string) => void;
}

export const SensitiveDataDetector = ({
  content,
  onContentMasked,
}: SensitiveDataDetectorProps) => {
  const [sensitiveData, setSensitiveData] = useState<
    Array<{ type: string; value: string; start: number; end: number }>
  >([]);
  const [isMasked, setIsMasked] = useState(false);
  const [originalContent] = useState(content);

  const patterns = [
    {
      type: "Email",
      regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    },
    {
      type: "Phone",
      regex: /(\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g,
    },
    {
      type: "API Key",
      regex: /(?:api[_-]?key|token|secret)['":\s]*[a-zA-Z0-9-_]{20,}/gi,
    },
    { type: "Credit Card", regex: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g },
    { type: "SSN", regex: /\b\d{3}-?\d{2}-?\d{4}\b/g },
    { type: "Secret-like", regex: /\b[A-Za-z0-9_-]{32,}\b/g },
  ];

  useEffect(() => {
    const detected: Array<{
      type: string;
      value: string;
      start: number;
      end: number;
    }> = [];

    patterns.forEach((pattern) => {
      let match;
      while ((match = pattern.regex.exec(content)) !== null) {
        // Skip common words that might match the secret-like pattern
        if (pattern.type === "Secret-like") {
          const value = match[0];
          if (value.length < 40 || /^[a-z]+$/i.test(value)) continue;
        }

        detected.push({
          type: pattern.type,
          value: match[0],
          start: match.index,
          end: match.index + match[0].length,
        });
      }
    });

    setSensitiveData(detected);
  }, [content]);

  const maskContent = () => {
    let maskedContent = originalContent;

    // Sort by position (reverse order to maintain indices)
    const sortedData = [...sensitiveData].sort((a, b) => b.start - a.start);

    sortedData.forEach((item) => {
      const mask = "*".repeat(Math.min(item.value.length, 8));
      maskedContent =
        maskedContent.substring(0, item.start) +
        mask +
        maskedContent.substring(item.end);
    });

    setIsMasked(true);
    onContentMasked(maskedContent);
  };

  const unmaskContent = () => {
    setIsMasked(false);
    onContentMasked(originalContent);
  };

  if (sensitiveData.length === 0) return null;

  return (
    <Alert className="mb-4 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertDescription className="flex items-center justify-between">
        <span className="text-orange-800 dark:text-orange-200">
          Sensitive data found: {sensitiveData.map((d) => d.type).join(", ")}.
          Mask before sharing?
        </span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={isMasked ? "secondary" : "outline"}
            onClick={isMasked ? unmaskContent : maskContent}
            className="text-xs"
          >
            {isMasked ? (
              <>
                <Eye className="h-3 w-3 mr-1" />
                Show
              </>
            ) : (
              <>
                <EyeOff className="h-3 w-3 mr-1" />
                Mask All
              </>
            )}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

import { useState, useEffect } from "react";
import { File, CheckCircle, AlertCircle, Clock, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ContextChip } from "@/components/ui/feedback";

interface Document {
  id: string;
  title: string;
  type: string;
  size: number;
  uploaded_at: string;
  status?: "processing" | "ready" | "error";
  tags?: string[];
}

interface ContextManagerProps {
  documents: Document[];
  activeDocuments: string[];
  onDocumentToggle: (documentId: string) => void;
  onClearContext: () => void;
  className?: string;
}

export const ContextManager = ({
  documents,
  activeDocuments,
  onDocumentToggle,
  onClearContext,
  className,
}: ContextManagerProps) => {
  const [collapsed, setCollapsed] = useState(false);

  const activeDocList = documents.filter((doc) =>
    activeDocuments.includes(doc.id),
  );

  return null;
};

interface SessionContextProps {
  conversationCount: number;
  documentCount: number;
  sessionStart: Date;
  className?: string;
}

export const SessionContext = ({
  conversationCount,
  documentCount,
  sessionStart,
  className,
}: SessionContextProps) => {
  const [sessionDuration, setSessionDuration] = useState("");

  useEffect(() => {
    const updateDuration = () => {
      const now = new Date();
      const diff = now.getTime() - sessionStart.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);

      if (hours > 0) {
        setSessionDuration(`${hours}h ${minutes % 60}m`);
      } else {
        setSessionDuration(`${minutes}m`);
      }
    };

    updateDuration();
    const interval = setInterval(updateDuration, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [sessionStart]);

  return (
    <div
      className={`flex items-center gap-4 text-xs text-muted-foreground ${className || ""}`}
    >
      <div className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        <span>Session: {sessionDuration}</span>
      </div>
      <div className="flex items-center gap-1">
        <span>Messages: {conversationCount}</span>
      </div>
      <div className="flex items-center gap-1">
        <span>Docs: {documentCount}</span>
      </div>
    </div>
  );
};

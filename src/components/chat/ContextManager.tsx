import { useState, useEffect } from 'react';
import { File, CheckCircle, AlertCircle, Clock, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ContextChip } from '@/components/ui/feedback';

interface Document {
  id: string;
  title: string;
  type: string;
  size: number;
  uploaded_at: string;
  status?: 'processing' | 'ready' | 'error';
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

  const activeDocList = documents.filter((doc) => activeDocuments.includes(doc.id));

  if (!documents || documents.length === 0) return null;

  return (
    <div
      className={`rounded-xl border border-border/40 bg-muted/40 px-3 py-2 sm:px-4 sm:py-3 ${className || ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <File className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            Knowledge Context
          </span>
          {activeDocList.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              {activeDocList.length} active
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeDocList.length > 0 && (
            <button
              onClick={onClearContext}
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              Clear
            </button>
          )}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            {collapsed ? 'Show' : 'Hide'}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="mt-2 flex flex-wrap gap-2">
          {documents.map((doc) => {
            const isActive = activeDocuments.includes(doc.id);
            const label = (doc as any).title || (doc as any).file_name || 'Document';
            const status = (doc as any).processing_status as
              | 'processing'
              | 'ready'
              | 'error'
              | undefined;
            return (
              <button
                key={doc.id}
                onClick={() => onDocumentToggle(doc.id)}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs transition ${
                  isActive
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-foreground'
                }`}
                title={label}
              >
                {isActive ? (
                  <CheckCircle className="h-3.5 w-3.5" />
                ) : (
                  <File className="h-3.5 w-3.5" />
                )}
                <span className="max-w-[10rem] truncate sm:max-w-[16rem]">{label}</span>
                {status === 'processing' && (
                  <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">
                    processing
                  </span>
                )}
                {status === 'error' && (
                  <span className="ml-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] text-red-700">
                    error
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
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
  const [sessionDuration, setSessionDuration] = useState('');

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
    <div className={`flex items-center gap-4 text-xs text-muted-foreground ${className || ''}`}>
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

import { useEffect, useState } from "react";
import { CheckCircle, AlertCircle, Clock } from "lucide-react";

interface TypingIndicatorProps {
  className?: string;
}

export const TypingIndicator = ({ className }: TypingIndicatorProps) => {
  return (
    <div className={`typing-indicator ${className || ""}`}>
      <div className="typing-dot"></div>
      <div className="typing-dot"></div>
      <div className="typing-dot"></div>
    </div>
  );
};

interface ProgressBarProps {
  progress: number;
  className?: string;
  showPercentage?: boolean;
}

export const ProgressBar = ({
  progress,
  className,
  showPercentage = false,
}: ProgressBarProps) => {
  return (
    <div className={`space-y-1 ${className || ""}`}>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      {showPercentage && (
        <div className="text-xs text-muted-foreground text-right">
          {Math.round(progress)}%
        </div>
      )}
    </div>
  );
};

interface StatusIndicatorProps {
  status: "loading" | "success" | "error" | "idle" | "processing";
  message?: string;
  className?: string;
}

export const StatusIndicator = ({
  status,
  message,
  className,
}: StatusIndicatorProps) => {
  const icons = {
    loading: <Clock className="h-4 w-4 animate-spin" />,
    processing: <Clock className="h-4 w-4 animate-spin" />,
    success: <CheckCircle className="h-4 w-4 text-success" />,
    error: <AlertCircle className="h-4 w-4 text-destructive" />,
    idle: null,
  };

  const colors = {
    loading: "text-muted-foreground",
    processing: "text-accent",
    success: "text-success",
    error: "text-destructive",
    idle: "text-muted-foreground",
  };

  if (status === "idle") return null;

  return (
    <div
      className={`flex items-center gap-2 text-sm ${colors[status]} ${className || ""}`}
    >
      {icons[status]}
      {message && <span>{message}</span>}
    </div>
  );
};

interface ContextChipProps {
  label: string;
  active?: boolean;
  onRemove?: () => void;
  className?: string;
}

export const ContextChip = ({
  label,
  active = false,
  onRemove,
  className,
}: ContextChipProps) => {
  return (
    <div
      className={`context-chip ${active ? "active" : ""} ${className || ""}`}
    >
      <span className="truncate max-w-20">{label}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 hover:text-destructive transition-colors"
          aria-label={`Remove ${label}`}
        >
          ×
        </button>
      )}
    </div>
  );
};

interface LoadingStateProps {
  isLoading: boolean;
  message?: string;
  children: React.ReactNode;
  className?: string;
}

export const LoadingState = ({
  isLoading,
  message,
  children,
  className,
}: LoadingStateProps) => {
  return (
    <div className={`relative ${className || ""}`}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
          <div className="flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-3 shadow-lg">
            <TypingIndicator />
            {message && (
              <span className="text-sm text-muted-foreground">{message}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface AnimatedMessageProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export const AnimatedMessage = ({
  children,
  className,
  delay = 0,
}: AnimatedMessageProps) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`message-enter ${show ? "opacity-100" : "opacity-0"} ${className || ""}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

import { Button } from '@/components/ui/button';

interface QuickRepliesProps {
  suggestions: string[];
  onSuggestionClick: (suggestion: string) => void;
}

export const QuickReplies = ({ suggestions, onSuggestionClick }: QuickRepliesProps) => {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-muted-foreground">Quick follow-ups:</div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, idx) => (
          <Button
            key={idx}
            size="sm"
            variant="outline"
            onClick={() => onSuggestionClick(suggestion)}
            className="h-9 rounded-full border-border/50 bg-muted/30 px-4 text-sm transition-all duration-200 hover:border-border hover:bg-muted hover:shadow-sm"
          >
            {suggestion}
          </Button>
        ))}
      </div>
    </div>
  );
};

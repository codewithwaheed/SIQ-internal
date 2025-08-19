import { Button } from '@/components/ui/button';

interface QuickRepliesProps {
  suggestions: string[];
  onSuggestionClick: (suggestion: string) => void;
}

export const QuickReplies = ({ suggestions, onSuggestionClick }: QuickRepliesProps) => {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground font-medium">
        Quick follow-ups:
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, idx) => (
          <Button 
            key={idx}
            size="sm"
            variant="outline"
            onClick={() => onSuggestionClick(suggestion)}
            className="h-9 text-sm rounded-full px-4 bg-muted/30 hover:bg-muted border-border/50 hover:border-border transition-all duration-200 hover:shadow-sm"
          >
            {suggestion}
          </Button>
        ))}
      </div>
    </div>
  );
};
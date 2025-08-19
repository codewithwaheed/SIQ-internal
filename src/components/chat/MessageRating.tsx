import { useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface MessageRatingProps {
  messageId: string;
  conversationId: string;
  className?: string;
}

export const MessageRating = ({ messageId, conversationId, className }: MessageRatingProps) => {
  const [rating, setRating] = useState<'positive' | 'negative' | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const handleRating = async (ratingType: 'positive' | 'negative') => {
    // If clicking the same rating, remove it
    if (rating === ratingType) {
      setRating(null);
      setShowFeedback(false);
      setFeedbackText('');
      return;
    }

    setRating(ratingType);
    
    // Show feedback input for negative ratings
    if (ratingType === 'negative') {
      setShowFeedback(true);
      return;
    }

    // Submit positive rating immediately
    await submitRating(ratingType);
  };

  const submitRating = async (ratingType: 'positive' | 'negative' = rating!) => {
    if (!ratingType) return;

    setIsSubmitting(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('rate-message', {
        body: {
          messageId,
          conversationId,
          ratingType,
          feedbackText: feedbackText.trim() || undefined
        },
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Failed to submit rating');
      }

      setIsSubmitted(true);
      setShowFeedback(false);
      
      toast({
        title: "Thanks for your feedback!",
        description: ratingType === 'positive' 
          ? "Your positive rating helps us improve." 
          : "Your feedback will help us provide better responses.",
      });

    } catch (error: any) {
      console.error('Rating submission error:', error);
      toast({
        title: "Failed to submit rating",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
      
      // Reset state on error
      setRating(null);
      setShowFeedback(false);
      setFeedbackText('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFeedbackSubmit = () => {
    if (rating === 'negative') {
      submitRating('negative');
    }
  };

  if (isSubmitted) {
    return (
      <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
        <MessageSquare className="w-3 h-3" />
        <span>Thanks for your feedback!</span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Rating Buttons */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleRating('positive')}
          disabled={isSubmitting}
          className={cn(
            "h-7 w-7 p-0 hover:bg-green-100 dark:hover:bg-green-900/20",
            rating === 'positive' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          )}
        >
          <ThumbsUp className="w-3 h-3" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleRating('negative')}
          disabled={isSubmitting}
          className={cn(
            "h-7 w-7 p-0 hover:bg-red-100 dark:hover:bg-red-900/20",
            rating === 'negative' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          )}
        >
          <ThumbsDown className="w-3 h-3" />
        </Button>
      </div>

      {/* Feedback Input for Negative Ratings */}
      {showFeedback && rating === 'negative' && (
        <Card className="mt-2 animate-fade-in">
          <CardContent className="p-3 space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                What could be improved? (Optional)
              </label>
              <Textarea
                placeholder="e.g., Too vague, missing details, not relevant to my question..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                className="mt-1 text-sm resize-none"
                rows={2}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {feedbackText.length}/500 characters
              </p>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowFeedback(false);
                  setRating(null);
                  setFeedbackText('');
                }}
                disabled={isSubmitting}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleFeedbackSubmit}
                disabled={isSubmitting}
                className="text-xs"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
import { useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface MessageRatingProps {
  messageId: string;
  conversationId: string;
  className?: string;
}

// Predefined feedback tags for negative rating
const FEEDBACK_TAGS = [
  { id: 'bad_response', label: 'Poor response quality' },
  { id: 'irrelevant', label: 'Not relevant to my question' },
  { id: 'incomplete', label: 'Incomplete information' },
  { id: 'inaccurate', label: 'Contains inaccurate information' },
  { id: 'too_vague', label: 'Too vague or generic' },
  { id: 'unhelpful', label: 'Not helpful' },
];

export const MessageRating = ({ messageId, conversationId, className }: MessageRatingProps) => {
  const [rating, setRating] = useState<'positive' | 'negative' | null>(null);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const handleRating = async (ratingType: 'positive' | 'negative') => {
    // If clicking the same rating, remove it
    if (rating === ratingType) {
      setRating(null);
      setShowFeedbackDialog(false);
      setFeedbackText('');
      setSelectedTags([]);
      return;
    }

    setRating(ratingType);

    // Show feedback dialog for negative ratings
    if (ratingType === 'negative') {
      setShowFeedbackDialog(true);
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
          feedbackText: feedbackText.trim() || undefined,
          tags: selectedTags.length > 0 ? selectedTags : undefined,
        },
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Failed to submit rating');
      }

      setIsSubmitted(true);
      setShowFeedbackDialog(false);
    } catch (error: unknown) {
      console.error('Rating submission error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      
      toast({
        title: 'Failed to submit rating',
        description: errorMessage || 'Please try again later.',
        variant: 'destructive',
      });

      // Reset state on error
      setRating(null);
      setShowFeedbackDialog(false);
      setFeedbackText('');
      setSelectedTags([]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFeedbackSubmit = () => {
    if (rating === 'negative') {
      submitRating('negative');
    }
  };

  const handleTagToggle = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const resetFeedbackDialog = () => {
    setShowFeedbackDialog(false);
    setFeedbackText('');
    setSelectedTags([]);
    if (rating === 'negative') {
      setRating(null);
    }
  };

  if (isSubmitted) {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        <Button
          variant="ghost"
          size="sm"
          disabled
          className={cn(
            'h-7 w-7 p-0',
            rating === 'positive' &&
              'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
          )}
        >
          <ThumbsUp className="h-3 w-3" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          disabled
          className={cn(
            'h-7 w-7 p-0',
            rating === 'negative' && 
              'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
          )}
        >
          <ThumbsDown className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Rating Buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleRating('positive')}
          disabled={isSubmitting}
          className={cn(
            'h-7 w-7 p-0 transition-colors hover:bg-green-100 hover:text-green-700 dark:hover:bg-green-900/20 dark:hover:text-green-400',
            rating === 'positive' &&
              'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
          )}
        >
          <ThumbsUp className="h-3 w-3" />
        </Button>

        <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRating('negative')}
              disabled={isSubmitting}
              className={cn(
                'h-7 w-7 p-0 transition-colors hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/20 dark:hover:text-red-400',
                rating === 'negative' && 
                  'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
              )}
            >
              <ThumbsDown className="h-3 w-3" />
            </Button>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Help us improve</DialogTitle>
              <DialogDescription>
                Your feedback helps us provide better responses. What could be improved?
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Feedback Tags */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Select issues (optional):</label>
                <div className="grid grid-cols-1 gap-3">
                  {FEEDBACK_TAGS.map((tag) => (
                    <div key={tag.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={tag.id}
                        checked={selectedTags.includes(tag.id)}
                        onCheckedChange={() => handleTagToggle(tag.id)}
                      />
                      <label
                        htmlFor={tag.id}
                        className="text-sm cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {tag.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional Feedback */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Additional feedback (optional):</label>
                <Textarea
                  placeholder="Tell us more about what could be improved..."
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  className="resize-none"
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  {feedbackText.length}/500 characters
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={resetFeedbackDialog}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleFeedbackSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

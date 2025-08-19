import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Star, MessageSquare, ThumbsUp, ThumbsDown, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AIFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId?: string;
  escalationId?: string;
  messageId?: string;
  initialContext?: string;
}

interface FeedbackForm {
  feedback_type: string;
  rating: number;
  comments: string;
  ai_response_quality: string;
  suggested_improvement: string;
  category_tags: string[];
}

const feedbackTypes = [
  { value: 'ai_correct', label: 'AI Response was Correct', icon: CheckCircle, color: 'text-green-600' },
  { value: 'ai_incorrect', label: 'AI Response was Incorrect', icon: ThumbsDown, color: 'text-red-600' },
  { value: 'ai_incomplete', label: 'AI Response was Incomplete', icon: AlertTriangle, color: 'text-yellow-600' },
  { value: 'ai_unhelpful', label: 'AI Response was Unhelpful', icon: ThumbsDown, color: 'text-orange-600' },
  { value: 'escalation_unnecessary', label: 'Escalation was Unnecessary', icon: ThumbsUp, color: 'text-blue-600' },
  { value: 'escalation_justified', label: 'Escalation was Justified', icon: CheckCircle, color: 'text-green-600' },
  { value: 'other', label: 'Other', icon: MessageSquare, color: 'text-gray-600' }
];

const qualityOptions = [
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'average', label: 'Average' },
  { value: 'poor', label: 'Poor' },
  { value: 'very_poor', label: 'Very Poor' }
];

const commonTags = [
  'compliance', 'technical', 'policy', 'security', 'implementation', 
  'documentation', 'training', 'assessment', 'incident-response'
];

export function AIFeedbackModal({ 
  isOpen, 
  onClose, 
  conversationId, 
  escalationId, 
  messageId,
  initialContext 
}: AIFeedbackModalProps) {
  const [form, setForm] = useState<FeedbackForm>({
    feedback_type: '',
    rating: 0,
    comments: '',
    ai_response_quality: '',
    suggested_improvement: '',
    category_tags: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.feedback_type) {
      toast({
        title: "Error",
        description: "Please select a feedback type",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('submit-ai-feedback', {
        body: {
          conversation_id: conversationId,
          escalation_id: escalationId,
          message_id: messageId,
          feedback_type: form.feedback_type,
          rating: form.rating || undefined,
          comments: form.comments || undefined,
          ai_response_quality: form.ai_response_quality || undefined,
          suggested_improvement: form.suggested_improvement || undefined,
          category_tags: form.category_tags.length > 0 ? form.category_tags : undefined
        }
      });

      if (error) throw error;

      toast({
        title: "Feedback Submitted",
        description: "Thank you for helping improve our AI system!",
      });

      // Reset form and close modal
      setForm({
        feedback_type: '',
        rating: 0,
        comments: '',
        ai_response_quality: '',
        suggested_improvement: '',
        category_tags: []
      });
      onClose();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTagToggle = (tag: string) => {
    setForm(prev => ({
      ...prev,
      category_tags: prev.category_tags.includes(tag)
        ? prev.category_tags.filter(t => t !== tag)
        : [...prev.category_tags, tag]
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            AI Performance Feedback
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Context Display */}
          {initialContext && (
            <div className="bg-muted p-4 rounded-lg">
              <Label className="text-sm font-medium">Context</Label>
              <p className="text-sm text-muted-foreground mt-1">{initialContext}</p>
            </div>
          )}

          {/* Feedback Type */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Feedback Type *</Label>
            <div className="grid grid-cols-1 gap-2">
              {feedbackTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <Button
                    key={type.value}
                    type="button"
                    variant={form.feedback_type === type.value ? "default" : "outline"}
                    className="justify-start h-auto p-3"
                    onClick={() => setForm(prev => ({ ...prev, feedback_type: type.value }))}
                  >
                    <Icon className={`h-4 w-4 mr-2 ${type.color}`} />
                    {type.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Rating */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Overall Rating</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Button
                  key={star}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="p-1"
                  onClick={() => setForm(prev => ({ ...prev, rating: star }))}
                >
                  <Star 
                    className={`h-6 w-6 ${
                      star <= form.rating 
                        ? 'fill-yellow-400 text-yellow-400' 
                        : 'text-gray-300'
                    }`} 
                  />
                </Button>
              ))}
            </div>
          </div>

          {/* AI Response Quality */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">AI Response Quality</Label>
            <Select 
              value={form.ai_response_quality} 
              onValueChange={(value) => setForm(prev => ({ ...prev, ai_response_quality: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select quality level" />
              </SelectTrigger>
              <SelectContent>
                {qualityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category Tags */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Category Tags</Label>
            <div className="flex flex-wrap gap-2">
              {commonTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={form.category_tags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => handleTagToggle(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Comments */}
          <div className="space-y-3">
            <Label htmlFor="comments" className="text-sm font-medium">Comments</Label>
            <Textarea
              id="comments"
              placeholder="Share your thoughts on the AI's performance..."
              value={form.comments}
              onChange={(e) => setForm(prev => ({ ...prev, comments: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Suggested Improvement */}
          <div className="space-y-3">
            <Label htmlFor="improvement" className="text-sm font-medium">Suggested Improvement</Label>
            <Textarea
              id="improvement"
              placeholder="What would you suggest the AI should have said instead?"
              value={form.suggested_improvement}
              onChange={(e) => setForm(prev => ({ ...prev, suggested_improvement: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !form.feedback_type}>
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
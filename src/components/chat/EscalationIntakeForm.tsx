import { useState, useRef, useEffect } from 'react';
import {
  Upload,
  X,
  Clock,
  MessageSquare,
  Calendar,
  Shield,
  AlertTriangle,
  Info,
  Edit3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  id?: string;
}
interface EscalationIntakeFormProps {
  messages: Message[];
  onSubmit?: () => void;
  onCancel?: () => void;
}
const TOPIC_TAGS = [
  {
    id: 'cmmc',
    label: 'CMMC',
    icon: Shield,
  },
  {
    id: 'nist-800-171',
    label: 'NIST 800-171',
    icon: Shield,
  },
  {
    id: 'soc2',
    label: 'SOC 2',
    icon: Shield,
  },
  {
    id: 'fedramp',
    label: 'FedRAMP',
    icon: Shield,
  },
  {
    id: 'iso27001',
    label: 'ISO 27001',
    icon: Shield,
  },
  {
    id: 'gdpr',
    label: 'GDPR',
    icon: Shield,
  },
  {
    id: 'incident-response',
    label: 'Incident Response',
    icon: AlertTriangle,
  },
  {
    id: 'risk-assessment',
    label: 'Risk Assessment',
    icon: AlertTriangle,
  },
];
const URGENCY_LEVELS = [
  {
    value: 'low',
    label: 'Low - General guidance',
    color: 'bg-green-100 text-green-800',
  },
  {
    value: 'medium',
    label: 'Medium - Active project',
    color: 'bg-yellow-100 text-yellow-800',
  },
  {
    value: 'high',
    label: 'High - Blocking issue',
    color: 'bg-orange-100 text-orange-800',
  },
  {
    value: 'urgent',
    label: 'Urgent - Critical deadline',
    color: 'bg-red-100 text-red-800',
  },
];
export const EscalationIntakeForm = ({
  messages,
  onSubmit,
  onCancel,
}: EscalationIntakeFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const summaryRef = useRef<HTMLTextAreaElement>(null);
  const [formData, setFormData] = useState({
    topics: [] as string[],
    urgency: 'medium',
    responseType: 'async',
    summary: '',
    contactEmail: user?.email || '',
    attachChatContext: true,
  });
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTopicSelector, setShowTopicSelector] = useState(false);
  const [showContextReview, setShowContextReview] = useState(false);

  // Auto-generate summary from recent messages
  const generateSummary = () => {
    const recentMessages = messages.slice(-20);
    const userMessages = recentMessages.filter((m) => m.role === 'user');
    const assistantMessages = recentMessages.filter((m) => m.role === 'assistant');
    if (userMessages.length === 0) return '';

    // Create a concise summary
    const lastUserMessage = userMessages[userMessages.length - 1]?.content || '';
    const context = assistantMessages.length > 0 ? 'cybersecurity guidance' : 'assistance';
    return `I need help with ${lastUserMessage.slice(0, 100)}${lastUserMessage.length > 100 ? '...' : ''}. We've been discussing ${context} and I'd like expert consultation.`.slice(
      0,
      300,
    );
  };

  // Smart defaults - detect topics from conversation
  const detectTopicsFromMessages = () => {
    const content = messages
      .map((m) => m.content)
      .join(' ')
      .toLowerCase();
    const detectedTopics: string[] = [];
    TOPIC_TAGS.forEach((tag) => {
      const keywords = tag.id.split('-');
      if (keywords.some((keyword) => content.includes(keyword.toLowerCase()))) {
        detectedTopics.push(tag.id);
      }
    });
    return detectedTopics.slice(0, 3);
  };

  // Initialize form with smart defaults
  useEffect(() => {
    const autoSummary = generateSummary();
    const autoTopics = detectTopicsFromMessages();
    setFormData((prev) => ({
      ...prev,
      summary: autoSummary,
      topics: autoTopics,
    }));

    // Focus summary field after a brief delay
    setTimeout(() => {
      summaryRef.current?.focus();
    }, 100);
  }, [messages]);
  const toggleTopic = (topicId: string) => {
    setFormData((prev) => ({
      ...prev,
      topics: prev.topics.includes(topicId)
        ? prev.topics.filter((t) => t !== topicId)
        : [...prev.topics, topicId],
    }));
  };
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select a file smaller than 5MB.',
          variant: 'destructive',
        });
        return;
      }
      setUploadedFile(file);
    }
  };
  const handleSubmit = async () => {
    if (!formData.summary.trim()) {
      toast({
        title: 'Summary required',
        description: 'Please provide a brief summary of your issue.',
        variant: 'destructive',
      });
      return;
    }
    if (formData.topics.length === 0) {
      toast({
        title: 'Topic required',
        description: 'Please select at least one relevant topic.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create escalation with correct data structure
      const { data: escalationResult, error: createError } = await supabase.functions.invoke(
        'create-escalation',
        {
          body: {
            summary: formData.summary,
            priority: formData.urgency,
            framework_tags: formData.topics,
            response_type: formData.responseType,
            contact_email: formData.contactEmail,
            messageLog: formData.attachChatContext ? messages.slice(-25) : null,
            escalation_state: 'submitted',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language_preference: 'en',
          },
        },
      );

      if (createError) {
        console.error('Create escalation error:', createError);
        throw new Error(createError.message || 'Failed to create escalation');
      }

      console.log('Escalation created:', escalationResult);

      // Send confirmation email
      try {
        await supabase.functions.invoke('send-escalation-notification', {
          body: {
            escalationId: escalationResult.escalation?.id || 'Unknown',
            userEmail: formData.contactEmail,
            userName: user?.user_metadata?.first_name || 'User',
            summary: formData.summary,
            priority: formData.urgency,
            estimatedResponseTime: getEstimatedResponseTime(),
          },
        });
        console.log('Confirmation email sent');
      } catch (emailError) {
        console.warn('Failed to send confirmation email:', emailError);
        // Don't fail the whole process if email fails
      }

      // Show success message
      toast({
        title: 'Request Submitted Successfully! ✅',
        description: `Your escalation has been submitted and a confirmation email sent to ${formData.contactEmail}. Expected response within ${getEstimatedResponseTime()}.`,
      });

      // Close the modal after a brief delay to let user see the success message
      setTimeout(() => {
        onSubmit?.();
      }, 1500);
    } catch (error: any) {
      console.error('Escalation submission error:', error);

      // Show more specific error messages
      const errorMessage = error?.message || 'Unable to submit your escalation request';

      toast({
        title: 'Submission Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  const characterCount = formData.summary.length;
  const isOverLimit = characterCount > 300;

  // Calculate ETA based on urgency
  const getEstimatedResponseTime = () => {
    switch (formData.urgency) {
      case 'urgent':
        return '2 hours';
      case 'high':
        return '4 hours';
      case 'medium':
        return '24 hours';
      case 'low':
        return '72 hours';
      default:
        return '24 hours';
    }
  };
  return (
    <div className="relative flex max-h-[90vh] flex-col overflow-hidden rounded-lg bg-background shadow-lg">
      {/* Header */}
      <div className="border-b px-5 py-4">
        <h2 className="text-lg font-semibold">Talk to a Cybersecurity Expert</h2>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Summary Section */}
        <div className="px-5 py-4">
          <Label htmlFor="summary" className="text-sm font-medium">
            Summary
          </Label>
          <p className="mb-2 mt-1 text-xs text-muted-foreground">
            We summarized your recent chat. Edit if needed.
          </p>
          <Textarea
            id="summary"
            ref={summaryRef}
            value={formData.summary}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                summary: e.target.value,
              }))
            }
            placeholder="Briefly describe your cybersecurity challenge or question..."
            className={cn(
              'min-h-[80px] resize-none',
              isOverLimit && 'border-destructive focus:border-destructive',
            )}
            maxLength={300}
            aria-describedby="summary-helper"
          />
          <div className="mt-1 flex justify-between">
            <span id="summary-helper" className="text-xs text-muted-foreground">
              {characterCount}/300 characters
            </span>
            {isOverLimit && <span className="text-xs text-destructive">Too long</span>}
          </div>
        </div>

        {/* Urgency and Response Type */}
        <div className="border-t border-border/50 px-5 py-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="urgency" className="text-sm font-medium">
                Urgency
              </Label>
              <Select
                value={formData.urgency}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    urgency: value,
                  }))
                }
              >
                <SelectTrigger id="urgency" className="min-h-[48px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="response-type" className="text-sm font-medium">
                Preferred response
              </Label>
              <Select
                value={formData.responseType}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    responseType: value,
                  }))
                }
              >
                <SelectTrigger id="response-type" className="min-h-[48px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="async">Written response</SelectItem>
                  <SelectItem value="meeting">15 minute call</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Relevant Topics */}
        <div className="border-t border-border/50 px-5 py-4">
          <div className="mb-2 flex items-center justify-between">
            <Label className="text-sm font-medium">Relevant topics</Label>
            <Dialog open={showTopicSelector} onOpenChange={setShowTopicSelector}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-auto p-1 text-xs text-primary">
                  <Edit3 className="mr-1 h-3 w-3" />
                  Edit topics
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <div className="space-y-4">
                  <h3 className="font-medium">Select relevant topics</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {TOPIC_TAGS.map((topic) => {
                      const Icon = topic.icon;
                      const isSelected = formData.topics.includes(topic.id);
                      return (
                        <Button
                          key={topic.id}
                          variant={isSelected ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleTopic(topic.id)}
                          className="h-auto justify-start p-2"
                        >
                          <Icon className="mr-2 h-3 w-3" />
                          {topic.label}
                        </Button>
                      );
                    })}
                  </div>
                  <Button onClick={() => setShowTopicSelector(false)} className="w-full">
                    Done
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.topics.map((topicId) => {
              const topic = TOPIC_TAGS.find((t) => t.id === topicId);
              if (!topic) return null;
              const Icon = topic.icon;
              return (
                <Badge key={topicId} variant="secondary" className="text-xs">
                  <Icon className="mr-1 h-3 w-3" />
                  {topic.label}
                </Badge>
              );
            })}
            {formData.topics.length === 0 && (
              <span className="text-sm text-muted-foreground">No topics selected</span>
            )}
          </div>
        </div>

        {/* Contact Email */}
        <div className="border-t border-border/50 px-5 py-4">
          <Label htmlFor="email" className="text-sm font-medium">
            Contact email
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.contactEmail}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                contactEmail: e.target.value,
              }))
            }
            placeholder="your.email@company.com"
            className="mt-2 min-h-[48px]"
          />
        </div>

        {/* File Upload */}
        <div className="border-t border-border/50 px-5 py-4">
          <Label className="text-sm font-medium">Optional attachment</Label>
          <div className="mt-2">
            {uploadedFile ? (
              <div className="flex items-center gap-2 rounded-md bg-muted p-3">
                <Upload className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 truncate text-sm">{uploadedFile.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setUploadedFile(null)}
                  className="h-6 w-6 p-0"
                  aria-label="Remove file"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[48px] w-full justify-center border-dashed"
                type="button"
              >
                <Upload className="mr-2 h-4 w-4" />
                Choose file
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
              onChange={handleFileUpload}
              className="hidden"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              PDF, Word, or image files up to 5 MB
            </p>
          </div>
        </div>

        {/* Context Pack */}

        {/* Privacy Notice */}
      </div>

      {/* Sticky Footer */}
      <div className="sticky bottom-0 border-t bg-background px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">
            First reply in ~{getEstimatedResponseTime()}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel} className="min-h-[48px]">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                !formData.summary.trim() ||
                formData.topics.length === 0 ||
                isOverLimit
              }
              className="min-h-[48px]"
            >
              {isSubmitting ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle,
  MessageCircle,
  Calendar,
  FileText,
  ThumbsUp,
  ChevronDown,
  Clock,
  Shield,
  Download,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ExpertReply {
  id: string;
  type: 'answer' | 'checklist' | 'policy' | 'next_steps' | 'file_attachment';
  content: string;
  consultant_name: string;
  consultant_avatar?: string;
  created_at: string;
  attachments?: Array<{
    id: string;
    name: string;
    size: number;
    url: string;
  }>;
  checklist_items?: Array<{
    id: string;
    text: string;
    completed: boolean;
  }>;
  helpful_count?: number;
  clarification_requests?: number;
}

interface ExpertReplyCardProps {
  reply: ExpertReply;
  escalationId: string;
  onRequestClarification: (replyId: string, question: string) => void;
  onConvertToMeeting: (replyId: string) => void;
}

export function ExpertReplyCard({
  reply,
  escalationId,
  onRequestClarification,
  onConvertToMeeting,
}: ExpertReplyCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isHelpful, setIsHelpful] = useState(false);
  const [showClarificationForm, setShowClarificationForm] = useState(false);
  const [clarificationText, setClarificationText] = useState('');
  const [submittingClarification, setSubmittingClarification] = useState(false);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getReplyTypeIcon = (type: string) => {
    switch (type) {
      case 'checklist':
        return <CheckCircle className="h-4 w-4" />;
      case 'policy':
        return <Shield className="h-4 w-4" />;
      case 'next_steps':
        return <Clock className="h-4 w-4" />;
      case 'file_attachment':
        return <FileText className="h-4 w-4" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  const getReplyTypeLabel = (type: string) => {
    switch (type) {
      case 'answer':
        return 'Expert Answer';
      case 'checklist':
        return 'Action Checklist';
      case 'policy':
        return 'Policy Reference';
      case 'next_steps':
        return 'Next Steps';
      case 'file_attachment':
        return 'Document Delivery';
      default:
        return 'Expert Reply';
    }
  };

  const handleMarkHelpful = async () => {
    if (isHelpful) return;

    try {
      const { error } = await supabase.functions.invoke('mark-reply-helpful', {
        body: { replyId: reply.id, escalationId },
      });

      if (error) throw error;

      setIsHelpful(true);
      toast({
        title: 'Feedback sent',
        description: 'Thank you for marking this reply as helpful!',
      });
    } catch (error) {
      console.error('Error marking reply helpful:', error);
      toast({
        title: 'Error',
        description: 'Failed to send feedback',
        variant: 'destructive',
      });
    }
  };

  const handleSubmitClarification = async () => {
    if (!clarificationText.trim()) return;

    setSubmittingClarification(true);
    try {
      await onRequestClarification(reply.id, clarificationText);
      setClarificationText('');
      setShowClarificationForm(false);
      toast({
        title: 'Clarification sent',
        description: 'Your question has been sent to the consultant',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send clarification request',
        variant: 'destructive',
      });
    } finally {
      setSubmittingClarification(false);
    }
  };

  const renderChecklistContent = () => {
    if (!reply.checklist_items) return null;

    return (
      <div className="space-y-3">
        <p className="mb-4 text-sm text-muted-foreground">{reply.content}</p>
        <div className="space-y-2">
          {reply.checklist_items.map((item) => (
            <div key={item.id} className="flex items-start gap-3 rounded-lg bg-muted/30 p-3">
              <div
                className={`mt-1 flex h-4 w-4 items-center justify-center rounded border-2 ${
                  item.completed ? 'border-green-500 bg-green-500' : 'border-muted-foreground/30'
                }`}
              >
                {item.completed && <CheckCircle className="h-3 w-3 text-white" />}
              </div>
              <p
                className={`flex-1 text-sm ${item.completed ? 'text-muted-foreground line-through' : ''}`}
              >
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAttachments = () => {
    if (!reply.attachments || reply.attachments.length === 0) return null;

    return (
      <div className="mt-4 border-t border-border/30 pt-4">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-medium">
          <FileText className="h-4 w-4" />
          Attachments ({reply.attachments.length})
        </h4>
        <div className="space-y-2">
          {reply.attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between rounded-lg border border-border/30 bg-muted/20 p-3"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{attachment.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(attachment.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="h-8">
                <Download className="mr-1 h-3 w-3" />
                Download
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className="border-l-4 border-l-blue-500 bg-blue-50/30 dark:bg-blue-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={reply.consultant_avatar} />
              <AvatarFallback className="bg-blue-500 text-white">
                {reply.consultant_name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="mb-1 flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {getReplyTypeIcon(reply.type)}
                  {getReplyTypeLabel(reply.type)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatTimestamp(reply.created_at)}
                </span>
              </div>
              <p className="font-semibold text-blue-900 dark:text-blue-100">
                {reply.consultant_name}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">Cybersecurity Consultant</p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Reply content based on type */}
        {reply.type === 'checklist' ? (
          renderChecklistContent()
        ) : (
          <div className="prose prose-sm max-w-none">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{reply.content}</p>
          </div>
        )}

        {/* Attachments */}
        {renderAttachments()}

        <Separator className="my-4" />

        {/* Action buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={isHelpful ? 'default' : 'outline'}
              onClick={handleMarkHelpful}
              disabled={isHelpful}
              className="h-8"
            >
              <ThumbsUp className="mr-1 h-3 w-3" />
              {isHelpful ? 'Marked helpful' : 'Mark helpful'}
              {reply.helpful_count && reply.helpful_count > 0 && (
                <span className="ml-1 text-xs">({reply.helpful_count})</span>
              )}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowClarificationForm(!showClarificationForm)}
              className="h-8"
            >
              <MessageCircle className="mr-1 h-3 w-3" />
              Ask question
            </Button>
          </div>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => onConvertToMeeting(reply.id)}
            className="h-8"
          >
            <Calendar className="mr-1 h-3 w-3" />
            Schedule meeting
          </Button>
        </div>

        {/* Clarification form */}
        {showClarificationForm && (
          <div className="mt-4 rounded-lg border border-border/30 bg-muted/30 p-4">
            <h4 className="mb-2 text-sm font-medium">Ask for clarification</h4>
            <Textarea
              placeholder="What would you like the consultant to clarify or expand on?"
              value={clarificationText}
              onChange={(e) => setClarificationText(e.target.value)}
              rows={3}
              className="mb-3"
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleSubmitClarification}
                disabled={!clarificationText.trim() || submittingClarification}
              >
                {submittingClarification ? (
                  <div className="h-3 w-3 animate-spin rounded-full border-b-2 border-white" />
                ) : (
                  'Send question'
                )}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowClarificationForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

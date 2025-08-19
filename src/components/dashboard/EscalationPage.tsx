import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  FileText,
  MessageSquare,
  Send,
  Clock,
} from 'lucide-react';

interface ChatMessage {
  role: string;
  content: string;
  timestamp: string;
}

interface Document {
  id: string;
  file_name: string;
  uploaded_at: string;
}

export function EscalationPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [recentMessages, setRecentMessages] = useState<ChatMessage[]>([]);
  const [recentDocuments, setRecentDocuments] = useState<Document[]>([]);
  const [formData, setFormData] = useState({
    reason: '',
    description: '',
    priority: 'normal' as 'low' | 'normal' | 'high',
    includeChat: true,
    includeDocuments: true,
  });

  useEffect(() => {
    if (user) {
      fetchRecentChatMessages();
      fetchRecentDocuments();
    }
  }, [user]);

  const fetchRecentChatMessages = async () => {
    if (!user) return;

    try {
      // Get the most recent conversation
      const { data: conversations } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (conversations && conversations.length > 0) {
        // Get the last few messages from the most recent conversation
        const { data: messages } = await supabase
          .from('chat_messages')
          .select('role, content, timestamp')
          .eq('conversation_id', conversations[0].id)
          .order('timestamp', { ascending: false })
          .limit(5);

        if (messages) {
          setRecentMessages(messages.reverse()); // Show in chronological order
        }
      }
    } catch (error) {
      console.error('Error fetching recent messages:', error);
    }
  };

  const fetchRecentDocuments = async () => {
    if (!user) return;

    try {
      const { data: documents } = await supabase
        .from('documents')
        .select('id, file_name, uploaded_at')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false })
        .limit(3);

      if (documents) {
        setRecentDocuments(documents);
      }
    } catch (error) {
      console.error('Error fetching recent documents:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const escalationData = {
        user_id: user?.id,
        reason: formData.reason,
        chat_context: formData.includeChat ? JSON.stringify(recentMessages) : '',
        priority: formData.priority,
        description: formData.description,
        documents: formData.includeDocuments ? recentDocuments.map((doc) => doc.id) : [],
      };

      const { data, error } = await supabase.functions.invoke('create-escalation', {
        body: escalationData,
      });

      if (error) throw error;

      setSubmitted(true);
      toast({
        title: 'Escalation Submitted',
        description:
          'Your request has been sent to our expert team. Expect a reply within 24-48 hours.',
      });
    } catch (error) {
      console.error('Error submitting escalation:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit escalation. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="page mx-auto max-w-2xl">
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-8 text-center">
            <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-600" />
            <h1 className="mb-2 text-2xl font-bold text-green-800">
              Request Submitted Successfully
            </h1>
            <p className="mb-6 text-green-700">
              Your escalation has been sent to our expert cybersecurity team. A qualified consultant
              will review your case and follow up with you within 24-48 hours.
            </p>

            <div className="flex items-center justify-center gap-4 text-sm text-green-600">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Response time: 24-48 hours</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Business days only</span>
              </div>
            </div>

            <Button variant="outline" className="mt-6" onClick={() => setSubmitted(false)}>
              Submit Another Request
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="page mx-auto max-w-4xl">
      <div className="page-title">
        <h1 className="text-3xl font-bold">Escalate to Expert</h1>
        <p className="text-muted-foreground">
          Get personalized help from our cybersecurity consultants
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex-gap-4 flex-col">
        <div className="grid-2">
          {/* Main Form */}
          <div className="section-card">
            <h2 className="mb-space-2 flex items-center gap-space-2 text-xl font-semibold">
              <AlertTriangle className="h-5 w-5" />
              Request Details
            </h2>
            <p className="mb-space-4 text-muted-foreground">
              Tell us about your cybersecurity challenge
            </p>
            <div>
              <Label htmlFor="reason">What do you need help with?</Label>
              <Input
                id="reason"
                placeholder="e.g., Security audit, compliance question, incident response"
                value={formData.reason}
                onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Detailed Description</Label>
              <Textarea
                id="description"
                placeholder="Please provide more details about your situation, what you've tried, and what specific help you need..."
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={4}
                required
              />
            </div>

            <div>
              <Label>Priority Level</Label>
              <div className="mt-2 flex gap-3">
                {(['low', 'normal', 'high'] as const).map((priority) => (
                  <Button
                    key={priority}
                    type="button"
                    variant={formData.priority === priority ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormData((prev) => ({ ...prev, priority }))}
                  >
                    {priority === 'low' && '🟢'}
                    {priority === 'normal' && '🟡'}
                    {priority === 'high' && '🔴'}
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label>Contact Information</Label>
              <Input value={user?.email || ''} disabled className="bg-muted" />
              <p className="mt-1 text-xs text-muted-foreground">
                Our consultant will reach out to this email address
              </p>
            </div>
          </div>

          {/* Context Information */}
          <div className="flex-gap-4 flex-col">
            {/* Recent Chat Messages */}
            {recentMessages.length > 0 && (
              <div className="section-card">
                <div className="mb-space-4 flex items-center justify-between">
                  <h3 className="flex items-center gap-space-2 text-lg font-semibold">
                    <MessageSquare className="h-5 w-5" />
                    Recent Chat Context
                  </h3>
                  <div className="flex items-center gap-space-2">
                    <input
                      type="checkbox"
                      id="includeChat"
                      checked={formData.includeChat}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          includeChat: e.target.checked,
                        }))
                      }
                    />
                    <Label htmlFor="includeChat" className="text-sm">
                      Include in request
                    </Label>
                  </div>
                </div>
                <p className="mb-space-4 text-muted-foreground">
                  Last {recentMessages.length} messages from your recent chat
                </p>
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {recentMessages.map((message, index) => (
                    <div key={index} className="rounded-lg bg-muted/50 p-2">
                      <div className="mb-1 flex items-center gap-2">
                        <Badge
                          variant={message.role === 'user' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {message.role === 'user' ? 'You' : 'AI'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm">{message.content.slice(0, 150)}...</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Documents */}
            {recentDocuments.length > 0 && (
              <div className="section-card">
                <div className="mb-space-4 flex items-center justify-between">
                  <h3 className="flex items-center gap-space-2 text-lg font-semibold">
                    <FileText className="h-5 w-5" />
                    Recent Documents
                  </h3>
                  <div className="flex items-center gap-space-2">
                    <input
                      type="checkbox"
                      id="includeDocuments"
                      checked={formData.includeDocuments}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          includeDocuments: e.target.checked,
                        }))
                      }
                    />
                    <Label htmlFor="includeDocuments" className="text-sm">
                      Include in request
                    </Label>
                  </div>
                </div>
                <p className="mb-space-4 text-muted-foreground">Your recently uploaded documents</p>
                <div className="space-y-2">
                  {recentDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-2 rounded border p-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{doc.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expected Response Time */}
            <div className="section-card border-blue-200 bg-blue-50/50">
              <div className="mb-2 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-blue-800">Response Timeline</h3>
              </div>
              <p className="text-sm text-blue-700">
                Your assigned consultant will review your request and follow up within
                <strong> 24-48 hours</strong> during business days. For urgent security incidents,
                please mark as high priority.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={loading || !formData.reason || !formData.description}
            className="min-w-32"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Submit Request
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

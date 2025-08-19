import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Send,
  Plus,
  Trash2,
  Upload,
  CheckCircle,
  MessageCircle,
  Shield,
  Clock,
  FileText,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface ConsultantResponseInterfaceProps {
  escalationId: string;
  onResponseSent?: () => void;
  className?: string;
}

export function ConsultantResponseInterface({
  escalationId,
  onResponseSent,
  className,
}: ConsultantResponseInterfaceProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [responseType, setResponseType] = useState<
    'answer' | 'checklist' | 'policy' | 'next_steps' | 'file_attachment'
  >('answer');
  const [content, setContent] = useState('');
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const responseTypes = [
    {
      value: 'answer',
      label: 'Plain Answer',
      icon: MessageCircle,
      desc: 'Direct response to their question',
    },
    {
      value: 'checklist',
      label: 'Action Checklist',
      icon: CheckCircle,
      desc: 'Step-by-step tasks to complete',
    },
    {
      value: 'policy',
      label: 'Policy Reference',
      icon: Shield,
      desc: 'Official policy or procedure',
    },
    {
      value: 'next_steps',
      label: 'Next Steps',
      icon: Clock,
      desc: 'Recommended follow-up actions',
    },
    {
      value: 'file_attachment',
      label: 'Document Delivery',
      icon: FileText,
      desc: 'Send files or resources',
    },
  ];

  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return;

    const newItem: ChecklistItem = {
      id: crypto.randomUUID(),
      text: newChecklistItem.trim(),
      completed: false,
    };

    setChecklistItems((prev) => [...prev, newItem]);
    setNewChecklistItem('');
  };

  const removeChecklistItem = (id: string) => {
    setChecklistItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments((prev) => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const submitResponse = async () => {
    if (!content.trim() && responseType !== 'file_attachment') {
      toast({
        title: 'Content required',
        description: 'Please provide a response message',
        variant: 'destructive',
      });
      return;
    }

    if (responseType === 'checklist' && checklistItems.length === 0) {
      toast({
        title: 'Checklist items required',
        description: 'Please add at least one checklist item',
        variant: 'destructive',
      });
      return;
    }

    if (responseType === 'file_attachment' && attachments.length === 0) {
      toast({
        title: 'Files required',
        description: 'Please attach at least one file',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      // Upload attachments first if any
      const uploadedFiles = [];
      for (const file of attachments) {
        const fileName = `${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('consultant-deliverables')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        uploadedFiles.push({
          name: file.name,
          size: file.size,
          url: uploadData.path,
        });
      }

      // Submit the response
      const responseData = {
        escalation_id: escalationId,
        type: responseType,
        content: content.trim(),
        checklist_items: responseType === 'checklist' ? checklistItems : undefined,
        attachments: uploadedFiles.length > 0 ? uploadedFiles : undefined,
      };

      const { error } = await supabase.functions.invoke('consultant-respond', {
        body: responseData,
      });

      if (error) throw error;

      // Reset form
      setContent('');
      setChecklistItems([]);
      setAttachments([]);
      setResponseType('answer');

      toast({
        title: 'Response sent',
        description: 'Your response has been delivered to the client',
      });

      onResponseSent?.();
    } catch (error) {
      console.error('Error submitting response:', error);
      toast({
        title: 'Error',
        description: 'Failed to send response. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Send Expert Response
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Response Type Selection */}
        <div>
          <Label className="mb-3 block text-sm font-medium">Response Type</Label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {responseTypes.map((type) => (
              <Button
                key={type.value}
                variant={responseType === type.value ? 'default' : 'outline'}
                className="h-auto justify-start p-3"
                onClick={() => setResponseType(type.value as any)}
              >
                <type.icon className="mr-2 h-4 w-4 shrink-0" />
                <div className="min-w-0 text-left">
                  <div className="text-sm font-medium">{type.label}</div>
                  <div className="text-xs text-muted-foreground">{type.desc}</div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Content based on response type */}
        {responseType === 'checklist' ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="checklist-intro">Checklist Introduction</Label>
              <Textarea
                id="checklist-intro"
                placeholder="Provide context for this checklist..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <Label className="mb-2 block text-sm font-medium">Checklist Items</Label>
              <div className="space-y-2">
                {checklistItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 rounded bg-muted/30 p-2">
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 text-sm">{item.text}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeChecklistItem(item.id)}
                      className="h-6 w-6 p-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="mt-2 flex gap-2">
                <Input
                  placeholder="Add checklist item..."
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addChecklistItem()}
                />
                <Button size="sm" onClick={addChecklistItem} disabled={!newChecklistItem.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <Label htmlFor="response-content">
              {responseType === 'answer' && 'Your Answer'}
              {responseType === 'policy' && 'Policy Details'}
              {responseType === 'next_steps' && 'Next Steps'}
              {responseType === 'file_attachment' && 'File Description'}
            </Label>
            <Textarea
              id="response-content"
              placeholder={
                responseType === 'answer'
                  ? 'Provide a detailed answer to their question...'
                  : responseType === 'policy'
                    ? 'Reference the relevant policy or procedure...'
                    : responseType === 'next_steps'
                      ? 'Outline the recommended next steps...'
                      : 'Describe the files you are attaching...'
              }
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
            />
          </div>
        )}

        {/* File Attachments */}
        <div>
          <Label className="mb-2 block text-sm font-medium">Attachments (Optional)</Label>
          <div className="space-y-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded bg-muted/30 p-2"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm">{file.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {(file.size / 1024).toFixed(1)} KB
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeAttachment(index)}
                  className="h-6 w-6 p-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-2">
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
              accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              Attach Files
            </Button>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-4">
          <Button onClick={submitResponse} disabled={submitting} className="min-w-32">
            {submitting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Response
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

import { useState } from 'react';
import { Upload, File, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
// import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { AuditLogger } from '@/lib/audit-logger';

interface Document {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
  processing_status: string;
}

interface DocumentUploadProps {
  onDocumentUploaded?: (document: Document) => void;
  trigger?: React.ReactNode;
  conversationId?: string | null;
  onSubmitWithMessage?: (
    message: string,
    documentIds: string[],
    documentNames: string[],
    documentMeta?: Array<{ id: string; name: string; type?: string; size?: number }>,
  ) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const DocumentUpload = ({
  onDocumentUploaded,
  trigger,
  conversationId,
  onSubmitWithMessage,
  open: openProp,
  onOpenChange,
}: DocumentUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [uploadedDocs, setUploadedDocs] = useState<
    Array<{ id: string; name: string; type?: string; size?: number }>
  >([]);
  const [openInternal, setOpenInternal] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const validateFile = (file: File): string | null => {
    if (!file) return 'No file selected';

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedTypes.includes(file.type)) {
      return 'Only PDF or DOCX files are allowed.';
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return 'Please upload files smaller than 10MB.';
    }
    return null;
  };

  const beginUploadSingle = async (file: File) => {
    const err = validateFile(file);
    if (err) {
      toast({ title: 'Invalid file', description: err, variant: 'destructive' });
      return;
    }
    if (uploadedDocs.length >= 3) {
      toast({
        title: 'Attachment limit',
        description: 'You can attach up to 3 files.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => (prev >= 90 ? prev : Math.min(90, prev + 10)));
    }, 200);

    try {
      // First, create or ensure we have a conversation ID
      let finalConversationId = conversationId;
      
      if (!finalConversationId) {
        console.log('Creating new conversation for document upload...');
        const conversationTitle = `Document Analysis: ${file.name.replace(/\.[^/.]+$/, '')}`;
        
        if (!user?.id) {
          throw new Error('User must be authenticated to create conversations');
        }
        
        const { data: newConversation, error: convError } = await supabase
          .from('chat_conversations')
          .insert({
            title: conversationTitle,
            tags: ['document-upload'],
            user_id: user.id, // Explicitly set user_id
          })
          .select()
          .single();

        if (convError || !newConversation) {
          throw new Error('Failed to create conversation for document');
        }
        
        finalConversationId = newConversation.id;
        console.log('Created conversation:', finalConversationId);
      }

      const formData = new FormData();
      formData.append('file', file);
      
      // Always include conversation ID now
      formData.append('conversation_id', finalConversationId);

      const { data, error } = await supabase.functions.invoke('upload-document', {
        body: formData,
      });
      if (error) throw error;
      if (!data?.success || !data.document?.id) throw new Error(data?.error || 'Upload failed');

      const docId = data.document.id as string;
      const docName = (data.document.file_name as string) || file.name;
      const docType = (data.document.file_type as string) || file.type;
      const docSize = (data.document.file_size as number) || file.size;

      setUploadedDocs((prev) =>
        [...prev, { id: docId, name: docName, type: docType, size: docSize }].slice(0, 3),
      );
      setUploadProgress(100);
      if (user) {
        AuditLogger.logFileOperation(user.id, 'FILE_UPLOADED', file.name, docId, {
          size: file.size,
          type: file.type,
          description: 'Attached via chat',
        });
      }
      if (onDocumentUploaded) onDocumentUploaded(data.document);

      // Kick off indexing on the client side without blocking UI
      try {
        // Fire-and-forget; handle completion via Realtime document updates
        void supabase.functions
          .invoke('qdrant-index', {
            body: { docId, conversationId: finalConversationId },
          })
          .then(() => console.log('Indexing started for', docId))
          .catch((e) => console.warn('Indexing invoke failed:', e?.message || e));
      } catch (e: any) {
        console.warn('Failed to start indexing:', e?.message || e);
      }

      toast({
        title: 'Processing document',
        description: 'We are analyzing and indexing your document in the background.',
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload document.',
        variant: 'destructive',
      });
    } finally {
      clearInterval(progressInterval);
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = (e.dataTransfer.files && e.dataTransfer.files[0]) || null;
    if (!file) return;
    beginUploadSingle(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (uploadedDocs.length >= 3) {
      toast({
        title: 'Attachment limit',
        description: 'You can attach up to 3 files per message.',
        variant: 'destructive',
      });
      // clear selection so same file change triggers again later
      e.currentTarget.value = '';
      return;
    }
    if (uploading) {
      toast({
        title: 'Upload in progress',
        description: 'Please wait until the current file finishes uploading.',
        variant: 'destructive',
      });
      e.currentTarget.value = '';
      return;
    }
    const file = (e.target.files && e.target.files[0]) || null;
    if (!file) return;
    void beginUploadSingle(file);
  };

  const resetModal = () => {
    setUploadedDocs([]);
    setMessage('');
    setUploadProgress(0);
    setUploading(false);
    setDragActive(false);
  };

  const handleModalClose = (open: boolean) => {
    if (openProp === undefined) setOpenInternal(open);
    onOpenChange?.(open);
    if (!open) {
      resetModal();
    }
  };

  const controlled = openProp !== undefined;
  return (
    <Dialog open={controlled ? openProp : openInternal} onOpenChange={handleModalClose}>
      {!controlled && (
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" className="gap-2">
              <Upload className="h-4 w-4" />
              Upload Document
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Attach Documents</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <>
            {/* Drag and Drop Area */}
            <div
              className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                dragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="document-upload"
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                accept=".pdf,.docx"
                onChange={handleInputChange}
                // do not disable; show toast on change instead
              />

              <div className="flex flex-col items-center space-y-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  {uploading ? (
                    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
                  ) : (
                    <Upload className="h-8 w-8 text-primary" />
                  )}
                </div>

                <div>
                  <p className="text-lg font-medium text-foreground">
                    {uploading ? 'Uploading...' : 'Drop your document here or click to browse'}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">PDF or DOCX (max 10MB)</p>
                </div>

                {!uploading && (
                  <Button variant="outline" size="lg" className="mt-4">
                    <File className="mr-2 h-5 w-5" />
                    Choose File
                  </Button>
                )}
              </div>
            </div>

            {/* Upload Progress */}
            {uploading && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Uploading…</span>
                  <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {/* Uploaded files tiles (up to 3) */}
            {uploadedDocs.length > 0 && (
              <div className="mt-4">
                <Label className="mb-2 block">
                  Attached file{uploadedDocs.length > 1 ? 's' : ''}
                </Label>
                <div className="flex flex-col gap-2">
                  {uploadedDocs.map((f, idx) => (
                    <div
                      key={idx}
                      className="flex w-full items-start justify-between rounded-md border bg-card px-3 py-2 text-sm shadow-sm"
                      title={f.name}
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-2 pr-2">
                        <File className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        <span className="whitespace-normal break-words">{f.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-destructive"
                        onClick={() => setUploadedDocs((prev) => prev.filter((_, i) => i !== idx))}
                        aria-label={`Remove ${f.name}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Message (always enabled; only send is gated) */}
            <div className="space-y-2">
              <Label htmlFor="message">Message to the assistant</Label>
              <Textarea
                id="message"
                placeholder={'Ask a question or describe what to analyze…'}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={false}
                className="min-h-[80px]"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col justify-end gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => {
                  if (!onSubmitWithMessage) return;
                  const ids = uploadedDocs.map((d) => d.id);
                  const names = uploadedDocs.map((d) => d.name);
                  const meta = uploadedDocs.map((d) => ({
                    id: d.id,
                    name: d.name,
                    type: d.type,
                    size: d.size,
                  }));
                  onSubmitWithMessage(message.trim(), ids, names, meta);
                  handleModalClose(false);
                }}
                disabled={uploading || uploadedDocs.length === 0 || message.trim().length === 0}
              >
                Send to chat
              </Button>
            </div>
          </>
        </div>
      </DialogContent>
    </Dialog>
  );
};

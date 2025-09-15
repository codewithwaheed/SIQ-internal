import { useState } from 'react';
import { Upload, FileText, MessageSquare, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';

interface SmartDocumentUploadProps {
  onUploadSuccess?: (document: any, conversationId?: string) => void;
  className?: string;
}

export const SmartDocumentUpload = ({ onUploadSuccess, className }: SmartDocumentUploadProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const validateFile = (file: File): string | null => {
    if (!file) return 'No file selected';

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];

    if (!allowedTypes.includes(file.type)) {
      return 'Only PDF, DOCX, or TXT files are allowed.';
    }

    if (file.size > 10 * 1024 * 1024) {
      return 'Please upload files smaller than 10MB.';
    }

    return null;
  };

  const handleFileSelect = (file: File) => {
    const error = validateFile(file);
    if (error) {
      toast({
        title: 'Invalid file',
        description: error,
        variant: 'destructive',
      });
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        const newProgress = prev + Math.random() * 20;
        return newProgress >= 90 ? 90 : newProgress;
      });
    }, 200);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const { data, error } = await supabase.functions.invoke('upload-document', {
        body: formData,
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (error || !data) {
        throw new Error(error?.message || 'Upload failed');
      }

      if (data.success) {
        const document = data.document;
        const conversationId = data.conversation_id;

        toast({
          title: 'Upload successful!',
          description: `${selectedFile.name} has been uploaded and a conversation created.`,
        });

        // Call the success callback
        if (onUploadSuccess) {
          onUploadSuccess(document, conversationId);
        }

        // Navigate to the new conversation if one was created
        if (conversationId) {
          navigate(`/dashboard/chat/${conversationId}`);
        }

        // Reset the form
        setSelectedFile(null);
        setUploadProgress(0);
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error: any) {
      clearInterval(progressInterval);
      console.error('Upload error:', error);

      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload document. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
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

    const files = e.dataTransfer.files;
    if (files?.[0]) {
      handleFileSelect(files[0]);
    }
  };

  return (
    <Card className={`w-full max-w-md ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Smart Document Upload
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!selectedFile ? (
          <div
            className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">
              Drag & drop a document or{' '}
              <label className="cursor-pointer text-primary hover:underline">
                browse files
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.txt"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />
              </label>
            </p>
            <p className="mt-1 text-xs text-gray-500">PDF, DOCX, or TXT up to 10MB</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
              <FileText className="h-5 w-5 text-blue-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">{Math.round(selectedFile.size / 1024)} KB</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFile(null)}
                disabled={isUploading}
              >
                ×
              </Button>
            </div>

            {isUploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} />
                <p className="text-center text-xs text-gray-500">
                  {uploadProgress < 90 ? 'Uploading...' : 'Processing & creating embeddings...'}
                </p>
              </div>
            )}

            <Button onClick={handleUpload} disabled={isUploading} className="w-full">
              {isUploading ? (
                'Uploading...'
              ) : (
                <>
                  Upload & Start Chat
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        )}

        <div className="space-y-1 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-3 w-3" />
            <span>A new conversation will be created automatically</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-3 w-3" />
            <span>Document will be processed for AI analysis</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

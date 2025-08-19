import { useState } from 'react';
import { Upload, File, X, CheckCircle, AlertCircle, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
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
}

export const DocumentUpload = ({ onDocumentUploaded, trigger }: DocumentUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/csv',
      'application/csv'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload PDF, TXT, Word documents, or CSV files only.",
        variant: "destructive",
      });
      return;
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload files smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadedFile(file);
    setUploading(true);
    setUploadProgress(0);

    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (description) {
        formData.append('description', description);
      }

      const { data, error } = await supabase.functions.invoke('upload-document', {
        body: formData,
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        setUploadProgress(100);
        setUploadSuccess(true);
        
        // Log successful upload
        if (user) {
          AuditLogger.logFileOperation(
            user.id, 
            'FILE_UPLOADED', 
            file.name, 
            data.document?.id, 
            { 
              size: file.size, 
              type: file.type,
              description: description || 'No description provided'
            }
          );
        }
        
        if (onDocumentUploaded) {
          onDocumentUploaded(data.document);
        }
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      clearInterval(progressInterval);
      
      // Log failed upload
      if (user) {
        AuditLogger.logFileOperation(
          user.id, 
          'FILE_UPLOADED', 
          file.name, 
          undefined, 
          { error: error.message, size: file.size, status: 'failed' }
        );
      }
      
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      clearInterval(progressInterval);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const resetModal = () => {
    setUploadedFile(null);
    setDescription('');
    setUploadProgress(0);
    setUploadSuccess(false);
    setUploading(false);
    setDragActive(false);
  };

  const handleModalClose = (open: boolean) => {
    setOpen(open);
    if (!open) {
      resetModal();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleModalClose}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Upload className="h-4 w-4" />
            Upload Document
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {!uploadSuccess ? (
            <>
              {/* Drag and Drop Area */}
              <div
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
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
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept=".pdf,.txt,.doc,.docx,.csv"
                  onChange={handleInputChange}
                  disabled={uploading}
                />
                
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    {uploading ? (
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    ) : (
                      <Upload className="h-8 w-8 text-primary" />
                    )}
                  </div>
                  
                  <div>
                    <p className="text-lg font-medium text-foreground">
                      {uploading ? 'Uploading...' : 'Drop your document here or click to browse'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Supports PDF, TXT, DOC, DOCX, CSV (max 10MB)
                    </p>
                  </div>
                  
                  {!uploading && (
                    <Button variant="outline" size="lg" className="mt-4">
                      <File className="h-5 w-5 mr-2" />
                      Choose File
                    </Button>
                  )}
                </div>
              </div>

              {/* Upload Progress */}
              {uploading && uploadedFile && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{uploadedFile.name}</span>
                    <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}

              {/* Description Field */}
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Add a description for this document..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={uploading}
                  className="min-h-[80px]"
                />
              </div>
            </>
          ) : (
            /* Success State */
            <div className="text-center space-y-6 py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-foreground">Upload Successful!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {uploadedFile?.name} has been uploaded and processed.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  className="gap-2"
                  onClick={() => {
                    setOpen(false);
                    // Trigger opening chat or navigating to chat
                  }}
                >
                  <MessageCircle className="h-4 w-4" />
                  Ask the assistant about this document
                </Button>
                <Button 
                  variant="outline"
                  onClick={resetModal}
                >
                  Upload Another
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
import { useState, useRef } from 'react';
import { Upload, File, X, CheckCircle, AlertCircle, Tags, Loader2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { extractTextFromFile, type ExtractionQuality } from '@/lib/documentExtraction';

interface Document {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
  processing_status: string;
}

interface UnifiedDocumentUploadProps {
  onUploadSuccess?: (document: Document) => void;
  trigger?: React.ReactNode;
  variant?: 'dialog' | 'inline';
  showDescription?: boolean;
  showTags?: boolean;
  className?: string;
}

export const UnifiedDocumentUpload = ({
  onUploadSuccess,
  trigger,
  variant = 'dialog',
  showDescription = true,
  showTags = true,
  className,
}: UnifiedDocumentUploadProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<
    'idle' | 'uploading' | 'processing' | 'success' | 'error'
  >('idle');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const allowedTypes = [
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  const validateFile = (file: File): boolean => {
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please select a PDF, TXT, or Word document.',
        variant: 'destructive',
      });
      return false;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select a file smaller than 10MB.',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleFileSelect = (file: File) => {
    if (validateFile(file)) {
      setSelectedFile(file);
      setUploadStatus('idle');
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
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

    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    setIsUploading(true);
    setUploadStatus('uploading');
    setUploadProgress(0);

    try {
      // Create progress simulation
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      let extractedText: string | null = null;
      let extractionQuality: ExtractionQuality | null = null;

      try {
        const extraction = await extractTextFromFile(selectedFile);
        if (extraction) {
          extractedText = extraction.text;
          extractionQuality = extraction.quality;
        }
      } catch (error) {
        console.warn('Client-side extraction failed; continuing without extracted text:', error);
      }

      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('user-documents')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Store document metadata
      const { data: document, error: dbError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          file_name: selectedFile.name,
          file_path: filePath,
          file_type: selectedFile.type,
          file_size: selectedFile.size,
          tags: tags,
          processing_status: 'pending',
          content_extracted: extractedText,
        })
        .select()
        .single();

      clearInterval(progressInterval);

      if (dbError) throw dbError;

      setUploadProgress(100);
      setUploadStatus('processing');

      if (extractionQuality) {
        console.log('Client extraction quality metrics:', extractionQuality);
      }

      setUploadStatus('success');

      toast({
        title: 'Upload successful',
        description: `${selectedFile.name} has been uploaded and is being processed.`,
      });

      onUploadSuccess?.(document);

      // Reset form
      setSelectedFile(null);
      setDescription('');
      setTags([]);
      setUploadProgress(0);

      if (variant === 'dialog') {
        setOpen(false);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      toast({
        title: 'Upload failed',
        description: error.message || 'An error occurred while uploading the file.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setUploadStatus('idle');
    setUploadProgress(0);
    setDescription('');
    setTags([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const UploadContent = () => (
    <div className={cn('space-y-6', className)}>
      {/* File Selection Area */}
      <div
        className={cn(
          'rounded-lg border-2 border-dashed p-8 text-center transition-all duration-200',
          dragActive
            ? 'border-accent bg-accent/5'
            : selectedFile
              ? 'border-success bg-success/5'
              : 'border-border hover:border-accent/50',
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {selectedFile ? (
          <div className="space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
              <CheckCircle className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
            </div>
            <Button variant="outline" size="sm" onClick={resetUpload}>
              <X className="mr-2 h-4 w-4" />
              Remove
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
              <Upload className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="font-medium">Drop your file here or click to browse</p>
              <p className="text-sm text-muted-foreground">
                Supports PDF, Word documents, and text files (max 10MB)
              </p>
            </div>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <File className="mr-2 h-4 w-4" />
              Choose File
            </Button>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt"
        onChange={handleFileInput}
        className="hidden"
      />

      {/* Description Field */}
      {showDescription && (
        <div className="space-y-2">
          <Label htmlFor="description">Description (Optional)</Label>
          <Textarea
            id="description"
            placeholder="Describe the document content or purpose..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
      )}

      {/* Tags */}
      {showTags && (
        <div className="space-y-2">
          <Label>Tags (Optional)</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Add a tag..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={addTag}>
              <Tags className="h-4 w-4" />
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="px-2 py-1">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {uploadStatus === 'uploading' ? 'Uploading...' : 'Processing...'}
            </span>
            <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="w-full" />
        </div>
      )}

      {/* Upload Button */}
      <div className="flex justify-end gap-3">
        {variant === 'dialog' && (
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        )}
        <Button
          onClick={handleUpload}
          disabled={!selectedFile || isUploading}
          className="min-w-[120px]"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </>
          )}
        </Button>
      </div>
    </div>
  );

  if (variant === 'inline') {
    return <UploadContent />;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
        </DialogHeader>
        <UploadContent />
      </DialogContent>
    </Dialog>
  );
};

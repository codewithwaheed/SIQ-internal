import { useState } from 'react';
import { Upload, Image as ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ImageUploadProps {
  trigger?: React.ReactNode;
  onSubmitWithImages?: (message: string, images: Array<{ name: string; previewUrl: string }>) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const ImageUpload = ({ trigger, onSubmitWithImages, open: openProp, onOpenChange }: ImageUploadProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [images, setImages] = useState<Array<{ name: string; previewUrl: string }>>([]);
  const [message, setMessage] = useState('');
  const [openInternal, setOpenInternal] = useState(false);
  const { toast } = useToast();

  const validateFile = (file: File): string | null => {
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) return 'Only PNG, JPG, WEBP, or GIF allowed.';
    if (file.size > 10 * 1024 * 1024) return 'Please upload images smaller than 10MB.';
    return null;
  };

  const addImage = (file: File) => {
    const err = validateFile(file);
    if (err) {
      toast({ title: 'Invalid image', description: err, variant: 'destructive' });
      return;
    }
    if (images.length >= 3) {
      toast({ title: 'Attachment limit', description: 'You can attach up to 3 images per message.', variant: 'destructive' });
      return;
    }
    const url = URL.createObjectURL(file);
    setImages((prev) => [...prev, { name: file.name, previewUrl: url }].slice(0, 3));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (images.length >= 3) {
      toast({ title: 'Attachment limit', description: 'You can attach up to 3 images per message.', variant: 'destructive' });
      e.currentTarget.value = '';
      return;
    }
    const file = (e.target.files && e.target.files[0]) || null;
    if (!file) return;
    addImage(file);
    e.currentTarget.value = '';
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = (e.dataTransfer.files && e.dataTransfer.files[0]) || null;
    if (!file) return;
    addImage(file);
  };

  const resetModal = () => {
    setImages([]);
    setMessage('');
    setUploading(false);
    setUploadProgress(0);
    setDragActive(false);
  };

  const handleModalClose = (v: boolean) => {
    if (openProp === undefined) setOpenInternal(v);
    onOpenChange?.(v);
    if (!v) resetModal();
  };

  const controlled = openProp !== undefined;
  return (
    <Dialog open={controlled ? openProp : openInternal} onOpenChange={handleModalClose}>
      {!controlled && (
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" className="gap-2">
              <ImageIcon className="h-4 w-4" />
              Upload Photos
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Upload Photos</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div
            className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              onChange={handleInputChange}
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
                <p className="text-lg font-medium text-foreground">Drop a photo or click to browse</p>
                <p className="mt-1 text-sm text-muted-foreground">PNG, JPG, WEBP, GIF (max 10MB)</p>
              </div>
            </div>
          </div>

          {uploading && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Processing…</span>
                <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {images.length > 0 && (
            <div className="space-y-2">
              <Label>Attached photos</Label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {images.map((img, idx) => (
                  <div key={idx} className="relative overflow-hidden rounded-md border bg-card">
                    {/* eslint-disable-next-line jsx-a11y/alt-text */}
                    <img src={img.previewUrl} className="h-28 w-full object-cover" />
                    <div className="flex items-center justify-between px-2 py-1 text-xs">
                      <span className="line-clamp-1" title={img.name}>
                        {img.name}
                      </span>
                      <button
                        className="text-destructive"
                        onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                        aria-label={`Remove ${img.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="message">Message to the assistant</Label>
            <Textarea
              id="message"
              placeholder={'Add context for these images…'}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (!onSubmitWithImages) return;
                if (images.length === 0 || message.trim().length === 0) return;
                onSubmitWithImages(message.trim(), images);
                setOpen(false);
                resetModal();
              }}
              disabled={images.length === 0 || message.trim().length === 0}
            >
              Send to chat
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

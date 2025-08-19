import { useState, useRef } from "react";
import { Upload, File, X, Tags, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RestrictedButton, UsageIndicator } from "@/components/ui/feature-gate";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { ProgressBar, StatusIndicator } from "@/components/ui/feedback";

interface DocumentUploadSimpleProps {
  onUploadSuccess?: (document: any) => void;
}

export const DocumentUploadSimple = ({
  onUploadSuccess,
}: DocumentUploadSimpleProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "processing" | "success" | "error"
  >("idle");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { checkFeatureAccess } = useFeatureGating();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        "application/pdf",
        "text/plain",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];

      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please select a PDF, TXT, or Word document.",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB.",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setTags([]);
    setTagInput("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (!tags.includes(newTag) && tags.length < 5) {
        setTags([...tags, newTag]);
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    // Check feature access before attempting upload
    const access = checkFeatureAccess("document_upload");
    if (!access.hasAccess) {
      toast({
        title: "Upload restricted",
        description:
          access.reason ||
          "Document upload is not available on your current plan.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadStatus("uploading");
    setUploadProgress(0);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error("Not authenticated");
      }

      const formData = new FormData();
      formData.append("file", selectedFile);

      // Add tags to formData if present
      if (tags.length > 0) {
        formData.append("tags", JSON.stringify(tags));
      }

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          const newProgress = prev + Math.random() * 20;
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 200);

      const response = await supabase.functions.invoke("upload-document", {
        body: formData,
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadStatus("processing");

      const { data, error } = response;

      if (error || !data) {
        throw new Error(error?.message || "Upload failed");
      }

      if (data.success) {
        setUploadStatus("success");

        // Show success feedback with animation
        setTimeout(() => {
          toast({
            title: "Upload successful!",
            description: `${selectedFile.name} has been uploaded and processed for AI analysis.`,
            className: "message-success",
          });

          setSelectedFile(null);
          setTags([]);
          setTagInput("");
          setUploadProgress(0);
          setUploadStatus("idle");

          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
          if (onUploadSuccess) {
            onUploadSuccess(data.document);
          }
        }, 1000); // Brief success state display
      } else {
        throw new Error(data.error || "Upload failed");
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      setUploadStatus("error");

      toast({
        title: "Upload failed",
        description:
          error.message || "Failed to upload document. Please try again.",
        variant: "destructive",
        className: "error-shake",
      });
    } finally {
      setIsUploading(false);

      // Reset progress after a delay if not successful
      if (uploadStatus !== "success") {
        setTimeout(() => {
          setUploadProgress(0);
          setUploadStatus("idle");
        }, 3000);
      }
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Usage Indicator */}
      <UsageIndicator feature="document_upload" />

      <div
        className={`upload-zone ${isUploading ? "uploading" : ""} border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors hover-lift`}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          accept=".pdf,.txt,.doc,.docx"
          className="hidden"
          disabled={isUploading}
        />

        {!selectedFile ? (
          <div className="space-y-4">
            <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <h3 className="text-lg font-medium">Upload Security Document</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Upload PDF, TXT, or Word documents for AI analysis with RAG
              </p>
            </div>
            <RestrictedButton
              feature="document_upload"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              variant="outline"
            >
              Select File
            </RestrictedButton>
          </div>
        ) : (
          <div className="space-y-4">
            {/* File Info with Status */}
            <div className="flex items-center justify-center space-x-2">
              <div className="flex items-center gap-2">
                {uploadStatus === "success" ? (
                  <CheckCircle className="h-5 w-5 text-success" />
                ) : (
                  <File className="h-5 w-5 text-blue-500" />
                )}
                <span className="font-medium">{selectedFile.name}</span>
                <span className="text-sm text-muted-foreground">
                  ({Math.round(selectedFile.size / 1024)} KB)
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveFile}
                disabled={isUploading}
                className="hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2">
                <ProgressBar progress={uploadProgress} showPercentage />
                <StatusIndicator
                  status={
                    uploadStatus === "uploading" ? "loading" : uploadStatus
                  }
                  message={
                    uploadStatus === "uploading"
                      ? "Uploading document..."
                      : uploadStatus === "processing"
                        ? "Processing & generating embeddings..."
                        : uploadStatus === "success"
                          ? "Upload complete!"
                          : uploadStatus === "error"
                            ? "Upload failed"
                            : undefined
                  }
                />
              </div>
            )}

            {/* Tags Section */}
            <div className="space-y-3 text-left">
              <Label
                htmlFor="tags"
                className="text-sm font-medium flex items-center"
              >
                <Tags className="h-4 w-4 mr-2" />
                Document Tags (Optional)
              </Label>

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-xs px-2 py-1"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-destructive"
                        disabled={isUploading}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <Input
                id="tags"
                placeholder="Add tags like 'compliance', 'security-policy' (press Enter)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                disabled={isUploading || tags.length >= 5}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Tags help categorize documents for better AI retrieval. Max 5
                tags.
              </p>
            </div>

            <RestrictedButton
              feature="document_upload"
              onClick={handleUpload}
              disabled={isUploading || uploadStatus === "success"}
              className={`w-full button-press ${uploadStatus === "success" ? "message-success" : ""}`}
            >
              {uploadStatus === "success" ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Document Processed Successfully
                </>
              ) : isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploadStatus === "uploading"
                    ? "Uploading..."
                    : "Processing..."}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload & Process Document
                </>
              )}
            </RestrictedButton>
          </div>
        )}
      </div>
    </div>
  );
};

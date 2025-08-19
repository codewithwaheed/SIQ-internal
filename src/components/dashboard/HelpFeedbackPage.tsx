import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const HelpFeedbackPage = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type (images only)
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file (PNG, JPG, etc.)",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const submissionType = formData.get("submissionType") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;

    // Basic validation
    if (!submissionType || !title || !description) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      // Here you would integrate with your backend to handle the submission
      // For now, we'll just simulate a successful submission
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast({
        title: "Feedback submitted successfully",
        description: "Thank you for your feedback! We'll get back to you soon.",
      });

      // Reset form
      (e.target as HTMLFormElement).reset();
      setSelectedFile(null);
    } catch (error) {
      toast({
        title: "Error submitting feedback",
        description: "Please try again later or contact support directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-title">
        <h1 className="text-2xl font-bold tracking-tight">
          Help Improve SentrIQ
        </h1>
        <p className="text-muted-foreground">
          You're part of our early access group, and your feedback plays a big
          role in making SentrIQ better. Whether it's a bug, a feature idea, or
          a small frustration, this is the place to share it.
        </p>
      </div>

      <div className="section-card">
        <form onSubmit={handleSubmit} className="flex-gap-4 flex-col">
          {/* Full Name */}
          <div className="grid grid-cols-2 gap-space-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                name="firstName"
                placeholder="First name"
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                name="lastName"
                placeholder="Last name"
                required
              />
            </div>
          </div>

          {/* Email Address */}
          <div>
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="example@example.com"
              required
            />
          </div>

          {/* Submission Type */}
          <div>
            <Label htmlFor="submissionType">What are you submitting? *</Label>
            <Select name="submissionType" required>
              <SelectTrigger>
                <SelectValue placeholder="Please Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bug">Bug Report</SelectItem>
                <SelectItem value="feature">Feature Request</SelectItem>
                <SelectItem value="feedback">General Feedback</SelectItem>
                <SelectItem value="question">Question</SelectItem>
                <SelectItem value="improvement">
                  Improvement Suggestion
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div>
            <Label htmlFor="title">Title of your request *</Label>
            <Input
              id="title"
              name="title"
              placeholder="Example: 'Add date filter to Chat History'"
              required
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Describe the issue or request *</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Example: 'When I add an entry and click save, the screen freezes on mobile. Happens in Chrome.'"
              className="min-h-[100px]"
              required
            />
          </div>

          {/* How would this help */}
          <div>
            <Label htmlFor="helpCreators">
              Why is this important to you? (optional)
            </Label>
            <Textarea
              id="helpCreators"
              name="helpCreators"
              placeholder="Optional but very helpful"
              className="min-h-[60px]"
            />
          </div>

          {/* File Upload */}
          <div>
            <Label htmlFor="screenshot">Attach a screenshot (if helpful)</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-space-6 text-center">
              <input
                type="file"
                id="screenshot"
                name="screenshot"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label htmlFor="screenshot" className="cursor-pointer">
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-space-2">
                    <FileText className="h-6 w-6 text-primary" />
                    <span className="text-sm font-medium">
                      {selectedFile.name}
                    </span>
                  </div>
                ) : (
                  <div className="flex-gap-4 flex-col items-center">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium text-primary hover:underline">
                        Browse Files
                      </span>
                      <br />
                      Drag and drop files here
                    </div>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Additional Information */}
          <div>
            <Label htmlFor="additional">Anything else?</Label>
            <Textarea
              id="additional"
              name="additional"
              className="min-h-[60px]"
            />
          </div>

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </form>
      </div>
    </div>
  );
};

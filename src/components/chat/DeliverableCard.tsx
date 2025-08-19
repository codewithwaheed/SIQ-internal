import React, { useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FileText,
  Download,
  CheckCircle,
  MessageSquare,
  RefreshCw,
  Clock,
  User,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Deliverable {
  id: string;
  escalation_id: string;
  consultant_id: string;
  deliverable_type:
    | "summary_memo"
    | "policy_draft"
    | "checklist"
    | "risk_log_entry"
    | "meeting_notes"
    | "roadmap";
  title: string;
  description?: string;
  content: any;
  file_attachments: Array<{
    name: string;
    url: string;
    size: number;
  }>;
  status: "draft" | "submitted" | "accepted" | "revision_requested";
  acceptance_deadline?: string;
  user_feedback?: string;
  revision_notes?: string;
  accepted_at?: string;
  created_at: string;
  updated_at: string;
  consultant: {
    name: string;
    avatar?: string;
  };
}

interface DeliverableCardProps {
  deliverable: Deliverable;
  onStatusUpdate?: () => void;
  className?: string;
}

export const DeliverableCard = ({
  deliverable,
  onStatusUpdate,
  className,
}: DeliverableCardProps) => {
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { toast } = useToast();

  const handleAccept = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("deliverables")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
          user_feedback: feedback || "Accepted without feedback",
        })
        .eq("id", deliverable.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Deliverable accepted successfully",
      });

      onStatusUpdate?.();
      setDetailsOpen(false);
    } catch (error) {
      console.error("Error accepting deliverable:", error);
      toast({
        title: "Error",
        description: "Failed to accept deliverable",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestRevision = async () => {
    if (!feedback.trim()) {
      toast({
        title: "Error",
        description: "Please provide feedback for the revision request",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("deliverables")
        .update({
          status: "revision_requested",
          revision_notes: feedback,
        })
        .eq("id", deliverable.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Revision requested successfully",
      });

      onStatusUpdate?.();
      setDetailsOpen(false);
    } catch (error) {
      console.error("Error requesting revision:", error);
      toast({
        title: "Error",
        description: "Failed to request revision",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async (attachment: any) => {
    try {
      const { data, error } = await supabase.storage
        .from("consultant-deliverables")
        .download(attachment.url);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = attachment.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const getTypeIcon = () => {
    switch (deliverable.deliverable_type) {
      case "summary_memo":
      case "policy_draft":
      case "meeting_notes":
        return <FileText className="h-4 w-4" />;
      case "checklist":
        return <CheckCircle className="h-4 w-4" />;
      case "roadmap":
        return <Clock className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusColor = () => {
    switch (deliverable.status) {
      case "accepted":
        return "default";
      case "submitted":
        return "secondary";
      case "revision_requested":
        return "destructive";
      case "draft":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getTypeLabel = () => {
    return deliverable.deliverable_type
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatTimestamp = (timestamp: string) => {
    return format(new Date(timestamp), "MMM d, yyyy h:mm a");
  };

  const renderContent = () => {
    if (
      deliverable.deliverable_type === "checklist" &&
      deliverable.content.items
    ) {
      return (
        <div className="space-y-2">
          {deliverable.content.items.map((item: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <CheckCircle
                className={`h-4 w-4 ${item.completed ? "text-green-600" : "text-muted-foreground"}`}
              />
              <span
                className={
                  item.completed ? "line-through text-muted-foreground" : ""
                }
              >
                {item.text}
              </span>
            </div>
          ))}
        </div>
      );
    }

    if (deliverable.content.text) {
      return <p className="text-sm">{deliverable.content.text}</p>;
    }

    return (
      <p className="text-sm text-muted-foreground">
        No content preview available
      </p>
    );
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">{getTypeIcon()}</div>
            <div>
              <h4 className="font-medium">{deliverable.title}</h4>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <Badge variant={getStatusColor()}>{getTypeLabel()}</Badge>
                <span>•</span>
                <span>{formatTimestamp(deliverable.created_at)}</span>
              </div>
            </div>
          </div>
          <Badge variant={getStatusColor()}>
            {deliverable.status.replace(/_/g, " ")}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {deliverable.description && (
          <p className="text-sm text-muted-foreground">
            {deliverable.description}
          </p>
        )}

        <div className="flex items-center gap-2 text-sm">
          <Avatar className="h-6 w-6">
            <AvatarImage src={deliverable.consultant.avatar} />
            <AvatarFallback>
              <User className="h-3 w-3" />
            </AvatarFallback>
          </Avatar>
          <span className="text-muted-foreground">
            by {deliverable.consultant.name}
          </span>
        </div>

        {deliverable.file_attachments &&
          deliverable.file_attachments.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium">Attachments</h5>
              <div className="space-y-1">
                {deliverable.file_attachments.map((attachment, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-muted rounded"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm">{attachment.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({Math.round(attachment.size / 1024)} KB)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadFile(attachment)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

        <div className="flex items-center gap-2">
          <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                View Details
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{deliverable.title}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Content</h4>
                  <div className="p-4 bg-muted rounded-lg">
                    {renderContent()}
                  </div>
                </div>

                {deliverable.status === "submitted" && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Your Feedback</h4>
                      <Textarea
                        placeholder="Provide feedback or comments..."
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handleAccept}
                        disabled={loading}
                        className="flex-1"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleRequestRevision}
                        disabled={loading}
                        className="flex-1"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Request Revision
                      </Button>
                    </div>
                  </div>
                )}

                {deliverable.user_feedback && (
                  <div>
                    <h4 className="font-medium mb-2">Your Previous Feedback</h4>
                    <p className="text-sm text-muted-foreground p-3 bg-muted rounded">
                      {deliverable.user_feedback}
                    </p>
                  </div>
                )}

                {deliverable.revision_notes && (
                  <div>
                    <h4 className="font-medium mb-2">Revision Notes</h4>
                    <p className="text-sm text-muted-foreground p-3 bg-muted rounded">
                      {deliverable.revision_notes}
                    </p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {deliverable.status === "submitted" && (
            <Button size="sm" onClick={() => setDetailsOpen(true)}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Review & Accept
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

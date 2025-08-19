import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Clock,
  User,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Escalation {
  id: string;
  user_id: string;
  session_id: string | null;
  message_log: any[] | null;
  reason: string | null;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
  assigned_consultant: string | null;
  resolved_at: string | null;
  profiles: any;
}

const EscalationQueue = () => {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [selectedEscalation, setSelectedEscalation] =
    useState<Escalation | null>(null);
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchEscalations = async () => {
    try {
      const { data, error } = await supabase
        .from("escalations")
        .select(
          `
          *,
          profiles(first_name, last_name, email, company_name)
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Process the data to ensure message_log is an array
      const processedData = (data || []).map((escalation) => ({
        ...escalation,
        message_log: Array.isArray(escalation.message_log)
          ? escalation.message_log
          : [],
      }));

      setEscalations(processedData);
    } catch (error) {
      console.error("Error fetching escalations:", error);
      toast({
        title: "Error",
        description: "Failed to load escalations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEscalations();
  }, []);

  const updateEscalationStatus = async (
    escalationId: string,
    status: string,
    assignedTo?: string,
  ) => {
    try {
      const updates: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (assignedTo) {
        updates.assigned_consultant = assignedTo;
      }

      if (status === "resolved") {
        updates.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("escalations")
        .update(updates)
        .eq("id", escalationId);

      if (error) throw error;

      await fetchEscalations();
      toast({
        title: "Success",
        description: "Escalation updated successfully",
      });
    } catch (error) {
      console.error("Error updating escalation:", error);
      toast({
        title: "Error",
        description: "Failed to update escalation",
        variant: "destructive",
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "normal":
        return "bg-blue-500";
      case "low":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500";
      case "in_progress":
        return "bg-blue-500";
      case "resolved":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return "Just now";
  };

  const filterEscalations = (status: string) => {
    if (status === "all") return escalations;
    return escalations.filter((esc) => esc.status === status);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Escalation Queue</h1>
          <p className="text-muted-foreground">
            Manage client escalations and support requests
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="text-sm">
            {escalations.filter((e) => e.status === "pending").length} Pending
          </Badge>
          <Badge variant="outline" className="text-sm">
            {escalations.filter((e) => e.status === "in_progress").length} In
            Progress
          </Badge>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Escalation List */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">All ({escalations.length})</TabsTrigger>
              <TabsTrigger value="pending">
                Pending ({filterEscalations("pending").length})
              </TabsTrigger>
              <TabsTrigger value="in_progress">
                In Progress ({filterEscalations("in_progress").length})
              </TabsTrigger>
              <TabsTrigger value="resolved">
                Resolved ({filterEscalations("resolved").length})
              </TabsTrigger>
            </TabsList>

            {["all", "pending", "in_progress", "resolved"].map((status) => (
              <TabsContent key={status} value={status} className="space-y-4">
                {filterEscalations(status).map((escalation) => (
                  <Card
                    key={escalation.id}
                    className={`cursor-pointer transition-colors hover:bg-accent ${
                      selectedEscalation?.id === escalation.id
                        ? "ring-2 ring-primary"
                        : ""
                    }`}
                    onClick={() => setSelectedEscalation(escalation)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarFallback>
                              {escalation.profiles?.first_name?.[0] ||
                                escalation.profiles?.email?.[0]?.toUpperCase() ||
                                "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-base">
                              {escalation.profiles?.first_name &&
                              escalation.profiles?.last_name
                                ? `${escalation.profiles.first_name} ${escalation.profiles.last_name}`
                                : escalation.profiles?.email || "Unknown User"}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {escalation.profiles?.company_name ||
                                "No company"}{" "}
                              • {getTimeAgo(escalation.created_at)}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge
                            className={`text-xs text-white ${getPriorityColor(escalation.priority)}`}
                          >
                            {escalation.priority}
                          </Badge>
                          <Badge
                            className={`text-xs text-white ${getStatusColor(escalation.status)}`}
                          >
                            {escalation.status.replace("_", " ")}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {escalation.reason || "No reason provided"}
                      </p>
                      <div className="flex items-center mt-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        Created{" "}
                        {new Date(escalation.created_at).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {filterEscalations(status).length === 0 && (
                  <Card>
                    <CardContent className="text-center py-8">
                      <p className="text-muted-foreground">
                        No escalations found
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* Escalation Details */}
        <div className="lg:col-span-1">
          {selectedEscalation ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Escalation Details</CardTitle>
                  <div className="flex space-x-2">
                    {selectedEscalation.status === "pending" && (
                      <Button
                        size="sm"
                        onClick={() =>
                          updateEscalationStatus(
                            selectedEscalation.id,
                            "in_progress",
                            user?.id,
                          )
                        }
                      >
                        Take Case
                      </Button>
                    )}
                    {(selectedEscalation.status === "in_progress" ||
                      selectedEscalation.status === "assigned") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            const { data, error } =
                              await supabase.functions.invoke(
                                "resolve-escalation",
                                {
                                  body: {
                                    escalationId: selectedEscalation.id,
                                    resolvedBy: "consultant",
                                    resolutionNotes: "Resolved by consultant",
                                  },
                                },
                              );

                            if (error || !data.success) {
                              throw new Error(
                                data?.error ||
                                  error?.message ||
                                  "Failed to resolve escalation",
                              );
                            }

                            toast({
                              title: "Escalation resolved",
                              description:
                                "The escalation has been marked as resolved.",
                            });
                            await fetchEscalations(); // Refresh data
                          } catch (error: any) {
                            toast({
                              title: "Failed to resolve escalation",
                              description: error.message,
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark Resolved
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm mb-2">
                    Client Information
                  </h4>
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="font-medium">Name:</span>{" "}
                      {selectedEscalation.profiles?.first_name || "N/A"}{" "}
                      {selectedEscalation.profiles?.last_name || ""}
                    </p>
                    <p>
                      <span className="font-medium">Email:</span>{" "}
                      {selectedEscalation.profiles?.email || "N/A"}
                    </p>
                    <p>
                      <span className="font-medium">Company:</span>{" "}
                      {selectedEscalation.profiles?.company_name || "N/A"}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-2">
                    Escalation Reason
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedEscalation.reason || "No specific reason provided"}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-2">Chat Messages</h4>
                  <div className="bg-muted p-3 rounded text-xs max-h-40 overflow-y-auto space-y-2">
                    {selectedEscalation.message_log &&
                    selectedEscalation.message_log.length > 0 ? (
                      selectedEscalation.message_log.map(
                        (message: any, index: number) => (
                          <div
                            key={index}
                            className={`p-2 rounded ${message.role === "user" ? "bg-primary/10" : "bg-background"}`}
                          >
                            <div className="text-xs text-muted-foreground mb-1">
                              {message.role === "user" ? "User" : "Assistant"}
                            </div>
                            <div className="text-xs">{message.content}</div>
                          </div>
                        ),
                      )
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No message log available
                      </p>
                    )}
                  </div>
                </div>

                {selectedEscalation.status === "in_progress" && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">
                      Consultant Response
                    </h4>
                    <Textarea
                      value={response}
                      onChange={(e) => setResponse(e.target.value)}
                      placeholder="Type your response to the client..."
                      rows={4}
                    />
                    <div className="flex space-x-2 mt-2">
                      <Button
                        className="flex-1"
                        size="sm"
                        onClick={async () => {
                          if (!response.trim()) return;

                          try {
                            const { data, error } =
                              await supabase.functions.invoke(
                                "consultant-respond",
                                {
                                  body: {
                                    escalationId: selectedEscalation.id,
                                    message: response.trim(),
                                  },
                                },
                              );

                            if (error || !data.success) {
                              throw new Error(
                                data?.error ||
                                  error?.message ||
                                  "Failed to send response",
                              );
                            }

                            toast({
                              title: "Response sent",
                              description:
                                "Your response has been sent to the client.",
                            });
                            setResponse("");
                            await fetchEscalations(); // Refresh data
                          } catch (error: any) {
                            toast({
                              title: "Failed to send response",
                              description: error.message,
                              variant: "destructive",
                            });
                          }
                        }}
                        disabled={!response.trim()}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Send Response
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            const { data, error } =
                              await supabase.functions.invoke(
                                "resolve-escalation",
                                {
                                  body: {
                                    escalationId: selectedEscalation.id,
                                    resolvedBy: "consultant",
                                    resolutionNotes:
                                      response.trim() ||
                                      "Resolved by consultant",
                                  },
                                },
                              );

                            if (error || !data.success) {
                              throw new Error(
                                data?.error ||
                                  error?.message ||
                                  "Failed to resolve escalation",
                              );
                            }

                            toast({
                              title: "Escalation resolved",
                              description:
                                "The escalation has been marked as resolved.",
                            });
                            setResponse("");
                            await fetchEscalations(); // Refresh data
                          } catch (error: any) {
                            toast({
                              title: "Failed to resolve escalation",
                              description: error.message,
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Resolve
                      </Button>
                    </div>
                  </div>
                )}

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>
                    Created:{" "}
                    {new Date(selectedEscalation.created_at).toLocaleString()}
                  </p>
                  <p>
                    Updated:{" "}
                    {new Date(selectedEscalation.updated_at).toLocaleString()}
                  </p>
                  {selectedEscalation.resolved_at && (
                    <p>
                      Resolved:{" "}
                      {new Date(
                        selectedEscalation.resolved_at,
                      ).toLocaleString()}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Select an escalation to view details
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default EscalationQueue;

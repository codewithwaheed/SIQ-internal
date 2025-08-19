import { useState, useEffect, useRef } from "react";
import { useChatApi } from "@/hooks/useChatApi";
import { useChatControls } from "@/hooks/useChatControls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageCircle,
  Send,
  Plus,
  User,
  Bot,
  UserCheck,
  Clock,
  AlertCircle,
  RefreshCw,
  Settings,
  TestTube,
  Play,
  Pause,
  XCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

interface ChatTestingInterfaceProps {
  className?: string;
}

export const ChatTestingInterface = ({
  className,
}: ChatTestingInterfaceProps) => {
  const { user } = useAuth();
  const {
    conversations,
    messages,
    currentConversation,
    loading,
    sending,
    error,
    loadConversations,
    createConversation,
    loadMessages,
    sendMessage,
    setCurrentConversation,
    clearError,
  } = useChatApi();

  const {
    pollProcessingStatus,
    waitForAIResponse,
    updateConversationStatus,
    simulateConsultantMessage,
    getConversationDetails,
    clearProcessingQueue,
    loading: controlsLoading,
  } = useChatControls();

  const [newMessage, setNewMessage] = useState("");
  const [newConversationTitle, setNewConversationTitle] = useState("");
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [consultantMessage, setConsultantMessage] = useState("");
  const [testResults, setTestResults] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load messages when conversation changes
  useEffect(() => {
    if (currentConversation) {
      loadMessages(currentConversation.id);
    }
  }, [currentConversation, loadMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentConversation || sending) return;

    const message = newMessage.trim();
    setNewMessage("");

    const sentMessage = await sendMessage(currentConversation.id, message);

    if (sentMessage) {
      // Start polling for AI response
      setProcessing(true);
      const responseReceived = await waitForAIResponse(
        currentConversation.id,
        sentMessage.id,
        15000, // 15 second timeout
      );

      if (responseReceived) {
        // Reload messages to show AI response
        await loadMessages(currentConversation.id);
      }
      setProcessing(false);
    }
  };

  const handleCreateConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConversationTitle.trim()) return;

    const conversation = await createConversation(newConversationTitle.trim());
    if (conversation) {
      setCurrentConversation(conversation);
      setNewConversationTitle("");
      setShowNewConversation(false);
    }
  };

  const handleSimulateConsultant = async () => {
    if (!consultantMessage.trim() || !currentConversation) return;

    const success = await simulateConsultantMessage(
      currentConversation.id,
      consultantMessage.trim(),
    );
    if (success) {
      setConsultantMessage("");
      await loadMessages(currentConversation.id);
    }
  };

  const runFullConversationTest = async () => {
    const results: any[] = [];
    setTestResults([]);

    try {
      // Step 1: Create conversation
      results.push({ step: "Creating conversation", status: "running" });
      setTestResults([...results]);

      const testConv = await createConversation("Test Conversation");
      if (!testConv) throw new Error("Failed to create conversation");

      results[0] = {
        step: "Creating conversation",
        status: "success",
        data: testConv,
      };
      setTestResults([...results]);

      // Step 2: Send user message
      results.push({ step: "Sending user message", status: "running" });
      setTestResults([...results]);

      const userMsg = await sendMessage(
        testConv.id,
        "Hello, I need help with cybersecurity compliance.",
      );
      if (!userMsg) throw new Error("Failed to send user message");

      results[1] = {
        step: "Sending user message",
        status: "success",
        data: userMsg,
      };
      setTestResults([...results]);

      // Step 3: Wait for AI response
      results.push({ step: "Waiting for AI response", status: "running" });
      setTestResults([...results]);

      const aiResponseReceived = await waitForAIResponse(
        testConv.id,
        userMsg.id,
        20000,
      );

      results[2] = {
        step: "Waiting for AI response",
        status: aiResponseReceived ? "success" : "warning",
        data: { received: aiResponseReceived },
      };
      setTestResults([...results]);

      // Step 4: Test escalation
      results.push({
        step: "Testing conversation escalation",
        status: "running",
      });
      setTestResults([...results]);

      const escalated = await updateConversationStatus(
        testConv.id,
        "escalated",
      );

      results[3] = {
        step: "Testing conversation escalation",
        status: escalated ? "success" : "error",
        data: { escalated },
      };
      setTestResults([...results]);

      // Step 5: Simulate consultant response
      results.push({
        step: "Simulating consultant response",
        status: "running",
      });
      setTestResults([...results]);

      const consultantResponse = await simulateConsultantMessage(
        testConv.id,
        "I can help you with compliance. Let me review your requirements.",
      );

      results[4] = {
        step: "Simulating consultant response",
        status: consultantResponse ? "success" : "error",
        data: { sent: consultantResponse },
      };
      setTestResults([...results]);

      // Step 6: Get final conversation state
      results.push({ step: "Verifying conversation state", status: "running" });
      setTestResults([...results]);

      const finalState = await getConversationDetails(testConv.id);

      results[5] = {
        step: "Verifying conversation state",
        status: finalState ? "success" : "error",
        data: finalState,
      };
      setTestResults([...results]);
    } catch (error) {
      results.push({
        step: "Test failed",
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      setTestResults([...results]);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "user":
        return <User className="w-4 h-4" />;
      case "assistant":
        return <Bot className="w-4 h-4" />;
      case "consultant":
        return <UserCheck className="w-4 h-4" />;
      default:
        return <MessageCircle className="w-4 h-4" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "user":
        return "bg-blue-500";
      case "assistant":
        return "bg-green-500";
      case "consultant":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "warning":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "running":
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className={cn("flex h-full max-h-[800px]", className)}>
      <Tabs defaultValue="chat" className="w-full flex flex-col">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="chat">Chat Interface</TabsTrigger>
          <TabsTrigger value="testing">Testing & Simulation</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="flex-1 flex min-h-0">
          {/* Chat Interface - Same as before */}
          <div className="w-1/3 border-r border-border flex flex-col">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Conversations</h2>
                <Button
                  size="sm"
                  onClick={() => setShowNewConversation(true)}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  New
                </Button>
              </div>

              {showNewConversation && (
                <form onSubmit={handleCreateConversation} className="space-y-2">
                  <Input
                    placeholder="Conversation title..."
                    value={newConversationTitle}
                    onChange={(e) => setNewConversationTitle(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!newConversationTitle.trim() || loading}
                    >
                      Create
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowNewConversation(false);
                        setNewConversationTitle("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>

            <ScrollArea className="flex-1">
              {loading && conversations.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Loading conversations...
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No conversations yet</p>
                  <p className="text-sm">
                    Create your first conversation to get started
                  </p>
                </div>
              ) : (
                <div className="p-2">
                  {conversations.map((conversation) => (
                    <Card
                      key={conversation.id}
                      className={cn(
                        "mb-2 cursor-pointer transition-colors hover:bg-accent",
                        currentConversation?.id === conversation.id &&
                          "bg-accent",
                      )}
                      onClick={() => setCurrentConversation(conversation)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-medium text-sm truncate">
                            {conversation.title}
                          </h3>
                          {conversation.chat_messages &&
                            conversation.chat_messages[0] && (
                              <Badge variant="secondary" className="text-xs">
                                {conversation.chat_messages[0].count}
                              </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {format(
                            new Date(conversation.updated_at),
                            "MMM d, h:mm a",
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {currentConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h1 className="text-xl font-semibold">
                      {currentConversation.title}
                    </h1>
                    <div className="flex gap-2">
                      {processing && (
                        <Badge variant="secondary" className="gap-2">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Processing AI response...
                        </Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadMessages(currentConversation.id)}
                        disabled={loading}
                      >
                        <RefreshCw
                          className={cn("w-4 h-4", loading && "animate-spin")}
                        />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  {error && (
                    <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-destructive" />
                      <span className="text-sm text-destructive">{error}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearError}
                        className="ml-auto"
                      >
                        Dismiss
                      </Button>
                    </div>
                  )}

                  {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No messages yet</p>
                      <p className="text-sm">Start the conversation below</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={cn(
                            "flex gap-3",
                            message.role === "user"
                              ? "justify-end"
                              : "justify-start",
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[70%] rounded-lg p-3",
                              message.role === "user"
                                ? "bg-primary text-primary-foreground ml-auto"
                                : "bg-muted",
                            )}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <div
                                className={cn(
                                  "p-1 rounded-full text-white",
                                  getRoleBadgeColor(message.role),
                                )}
                              >
                                {getRoleIcon(message.role)}
                              </div>
                              <span className="text-xs font-medium capitalize">
                                {message.role === "assistant"
                                  ? "AI Assistant"
                                  : message.role}
                              </span>
                              <span className="text-xs opacity-70">
                                {format(new Date(message.timestamp), "h:mm a")}
                              </span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">
                              {message.content}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t border-border">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      disabled={sending || processing}
                      className="flex-1"
                    />
                    <Button
                      type="submit"
                      disabled={!newMessage.trim() || sending || processing}
                      className="gap-2"
                    >
                      {sending ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Send
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
                <div>
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h2 className="text-xl font-semibold mb-2">
                    Welcome to Chat Testing
                  </h2>
                  <p>
                    Select a conversation or create a new one to start testing
                  </p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="testing" className="flex-1 flex min-h-0">
          <div className="w-full flex gap-4 p-4">
            {/* Testing Controls */}
            <div className="w-1/3 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TestTube className="w-4 h-4" />
                    Testing Controls
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    onClick={runFullConversationTest}
                    disabled={loading || controlsLoading}
                    className="w-full gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Run Full Test
                  </Button>

                  {currentConversation && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <h4 className="font-medium">Consultant Simulation</h4>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Consultant message..."
                            value={consultantMessage}
                            onChange={(e) =>
                              setConsultantMessage(e.target.value)
                            }
                            className="flex-1"
                          />
                          <Button
                            onClick={handleSimulateConsultant}
                            disabled={
                              !consultantMessage.trim() || controlsLoading
                            }
                            size="sm"
                          >
                            Send
                          </Button>
                        </div>
                      </div>

                      <Separator />
                      <div className="space-y-2">
                        <h4 className="font-medium">Status Management</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            onClick={() =>
                              updateConversationStatus(
                                currentConversation.id,
                                "escalated",
                              )
                            }
                            disabled={controlsLoading}
                            variant="outline"
                            size="sm"
                          >
                            Escalate
                          </Button>
                          <Button
                            onClick={() =>
                              updateConversationStatus(
                                currentConversation.id,
                                "resolved",
                              )
                            }
                            disabled={controlsLoading}
                            variant="outline"
                            size="sm"
                          >
                            Resolve
                          </Button>
                          <Button
                            onClick={() =>
                              updateConversationStatus(
                                currentConversation.id,
                                "closed",
                              )
                            }
                            disabled={controlsLoading}
                            variant="outline"
                            size="sm"
                          >
                            Close
                          </Button>
                          <Button
                            onClick={() =>
                              updateConversationStatus(
                                currentConversation.id,
                                "open",
                              )
                            }
                            disabled={controlsLoading}
                            variant="outline"
                            size="sm"
                          >
                            Reopen
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Test Results */}
            <div className="flex-1">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Test Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    {testResults.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        <TestTube className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No test results yet</p>
                        <p className="text-sm">
                          Run a test to see results here
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {testResults.map((result, index) => (
                          <Card key={index} className="p-3">
                            <div className="flex items-center gap-3">
                              {getStatusIcon(result.status)}
                              <div className="flex-1">
                                <div className="font-medium text-sm">
                                  {result.step}
                                </div>
                                {result.data && (
                                  <pre className="text-xs text-muted-foreground mt-1 overflow-auto">
                                    {JSON.stringify(result.data, null, 2)}
                                  </pre>
                                )}
                                {result.error && (
                                  <div className="text-xs text-red-500 mt-1">
                                    Error: {result.error}
                                  </div>
                                )}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

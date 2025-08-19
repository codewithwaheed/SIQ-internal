import { useState, useEffect, useRef } from 'react';
import { useChatApi } from '@/hooks/useChatApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  MessageCircle, 
  Send, 
  Plus, 
  User, 
  Bot, 
  UserCheck,
  Clock,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface ChatInterfaceProps {
  className?: string;
}

export const ChatInterface = ({ className }: ChatInterfaceProps) => {
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
    clearError
  } = useChatApi();

  const [newMessage, setNewMessage] = useState('');
  const [newConversationTitle, setNewConversationTitle] = useState('');
  const [showNewConversation, setShowNewConversation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    setNewMessage('');
    
    await sendMessage(currentConversation.id, message);
  };

  const handleCreateConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConversationTitle.trim()) return;

    const conversation = await createConversation(newConversationTitle.trim());
    if (conversation) {
      setCurrentConversation(conversation);
      setNewConversationTitle('');
      setShowNewConversation(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'user':
        return <User className="w-4 h-4" />;
      case 'assistant':
        return <Bot className="w-4 h-4" />;
      case 'consultant':
        return <UserCheck className="w-4 h-4" />;
      default:
        return <MessageCircle className="w-4 h-4" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'user':
        return 'bg-blue-500';
      case 'assistant':
        return 'bg-green-500';
      case 'consultant':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className={cn("flex h-full max-h-[800px]", className)}>
      {/* Conversations Sidebar */}
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
                <Button type="submit" size="sm" disabled={!newConversationTitle.trim() || loading}>
                  Create
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setShowNewConversation(false);
                    setNewConversationTitle('');
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
              <p className="text-sm">Create your first conversation to get started</p>
            </div>
          ) : (
            <div className="p-2">
              {conversations.map((conversation) => (
                <Card
                  key={conversation.id}
                  className={cn(
                    "mb-2 cursor-pointer transition-colors hover:bg-accent",
                    currentConversation?.id === conversation.id && "bg-accent"
                  )}
                  onClick={() => setCurrentConversation(conversation)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-sm truncate">{conversation.title}</h3>
                      {conversation.chat_messages && conversation.chat_messages[0] && (
                        <Badge variant="secondary" className="text-xs">
                          {conversation.chat_messages[0].count}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {format(new Date(conversation.updated_at), 'MMM d, h:mm a')}
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
                <h1 className="text-xl font-semibold">{currentConversation.title}</h1>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadMessages(currentConversation.id)}
                  disabled={loading}
                >
                  <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                </Button>
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
                        message.role === 'user' ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[70%] rounded-lg p-3",
                          message.role === 'user'
                            ? "bg-primary text-primary-foreground ml-auto"
                            : "bg-muted"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className={cn(
                            "p-1 rounded-full text-white",
                            getRoleBadgeColor(message.role)
                          )}>
                            {getRoleIcon(message.role)}
                          </div>
                          <span className="text-xs font-medium capitalize">
                            {message.role === 'assistant' ? 'AI Assistant' : message.role}
                          </span>
                          <span className="text-xs opacity-70">
                            {format(new Date(message.timestamp), 'h:mm a')}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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
                  disabled={sending}
                  className="flex-1"
                />
                <Button 
                  type="submit" 
                  disabled={!newMessage.trim() || sending}
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
              <h2 className="text-xl font-semibold mb-2">Welcome to Chat</h2>
              <p>Select a conversation or create a new one to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
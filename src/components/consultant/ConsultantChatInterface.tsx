import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Send, User, Bot, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { FeedbackButton } from './FeedbackButton';

interface Conversation {
  id: string;
  title: string;
  user_id: string;
  status: string;
  updated_at: string;
  escalation_id?: string;
  last_message?: string;
  user_name?: string;
  priority?: string;
}

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'consultant' | 'system';
  timestamp: string;
  sender_id?: string;
}

interface ConsultantChatInterfaceProps {
  conversation: Conversation;
  onBack: () => void;
}

export const ConsultantChatInterface = ({ conversation, onBack }: ConsultantChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadMessages();
    
    // Set up real-time subscription for new messages
    const channel = supabase
      .channel(`conversation_${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversation.id}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          if (newMessage.role === 'user') {
            setMessages(prev => [...prev, newMessage]);
            // Show notification for new user messages
            toast({
              title: "New Message",
              description: "The user has sent a new message.",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation.id, toast]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('timestamp', { ascending: true });

      if (error) throw error;

      const formattedMessages = (data || []).map(msg => ({
        id: msg.id,
        content: msg.content,
        role: msg.role as 'user' | 'assistant' | 'consultant' | 'system',
        timestamp: msg.timestamp,
        sender_id: msg.sender_id
      }));

      setMessages(formattedMessages);
    } catch (error: any) {
      console.error('Error loading messages:', error);
      toast({
        title: "Error",
        description: "Failed to load conversation history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || sending) return;

    const messageContent = input.trim();
    setSending(true);
    setInput('');

    try {
      // Add message optimistically
      const tempMessage: Message = {
        id: `temp_${Date.now()}`,
        content: messageContent,
        role: 'consultant',
        timestamp: new Date().toISOString(),
        sender_id: user?.id
      };
      setMessages(prev => [...prev, tempMessage]);

      // Send to backend
      const { data, error } = await supabase.functions.invoke('consultant-respond', {
        body: {
          conversationId: conversation.id,
          escalationId: conversation.escalation_id,
          message: messageContent,
          consultantId: user?.id
        }
      });

      if (error) throw error;

      // Replace temp message with actual message
      setMessages(prev => prev.map(msg => 
        msg.id === tempMessage.id ? data.message : msg
      ));

      toast({
        title: "Message Sent",
        description: "Your response has been sent to the user.",
      });

    } catch (error: any) {
      console.error('Error sending message:', error);
      // Remove temp message on error
      setMessages(prev => prev.filter(msg => msg.id !== `temp_${Date.now()}`));
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resolveConversation = async () => {
    try {
      const { error } = await supabase.functions.invoke('admin-escalations', {
        body: {
          action: 'update',
          escalationId: conversation.escalation_id,
          status: 'resolved'
        }
      });

      if (error) throw error;

      toast({
        title: "Conversation Resolved",
        description: "The conversation has been marked as resolved.",
      });

      onBack(); // Return to conversation list
    } catch (error: any) {
      console.error('Error resolving conversation:', error);
      toast({
        title: "Error",
        description: "Failed to resolve conversation",
        variant: "destructive"
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-red-500 bg-red-50 dark:bg-red-950';
      case 'high': return 'border-orange-500 bg-orange-50 dark:bg-orange-950';
      case 'normal': return 'border-blue-500 bg-blue-50 dark:bg-blue-950';
      case 'low': return 'border-gray-500 bg-gray-50 dark:bg-gray-950';
      default: return 'border-blue-500 bg-blue-50 dark:bg-blue-950';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <Card className={`mb-4 ${getPriorityColor(conversation.priority || 'normal')}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h2 className="text-xl font-bold">{conversation.title}</h2>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {conversation.user_name}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(conversation.updated_at), { addSuffix: true })}
                  </span>
                  <Badge variant={conversation.status === 'active' ? 'default' : 'secondary'}>
                    {conversation.status}
                  </Badge>
                  {conversation.priority && (
                    <Badge variant={conversation.priority === 'urgent' ? 'destructive' : 'outline'}>
                      {conversation.priority} priority
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            {conversation.status !== 'resolved' && (
              <Button 
                variant="outline" 
                onClick={resolveConversation}
                className="flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Mark Resolved
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Messages */}
      <Card className="flex-1 flex flex-col">
        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-[calc(100vh-300px)] p-4">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`mb-4 flex ${message.role === 'consultant' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] ${message.role === 'consultant' ? 'order-2' : 'order-1'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        {message.role === 'user' && <User className="h-4 w-4 text-blue-500" />}
                        {message.role === 'assistant' && <Bot className="h-4 w-4 text-green-500" />}
                        {message.role === 'consultant' && <User className="h-4 w-4 text-purple-500" />}
                        <span className="text-sm font-medium">
                          {message.role === 'user' ? 'User' : 
                           message.role === 'assistant' ? 'AI Assistant' : 
                           message.role === 'consultant' ? 'You' : 'System'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(message.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div
                        className={`p-3 rounded-lg ${
                          message.role === 'consultant'
                            ? 'bg-primary text-primary-foreground ml-4'
                            : message.role === 'user'
                            ? 'bg-muted mr-4'
                            : message.role === 'system'
                            ? 'bg-orange-100 dark:bg-orange-900 border border-orange-200 dark:border-orange-800 mr-4'
                            : 'bg-green-100 dark:bg-green-900 border border-green-200 dark:border-green-800 mr-4'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </ScrollArea>
        </CardContent>

        {/* Input and Actions */}
        <div className="p-4 border-t space-y-3">
          {/* Feedback Button - Show for AI messages */}
          {messages.some(m => m.role === 'assistant') && (
            <div className="flex justify-between items-center">
              <FeedbackButton
                conversationId={conversation.id}
                escalationId={conversation.escalation_id}
                context={`Conversation with ${conversation.user_name || 'User'}: ${conversation.title}`}
                variant="outline"
                size="sm"
              />
              <div className="text-xs text-muted-foreground">
                Help improve AI responses by providing feedback
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Textarea
              placeholder="Type your response to the user..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={sending || conversation.status === 'resolved'}
              className="flex-1 min-h-[60px] max-h-[120px]"
            />
            <Button 
              onClick={sendMessage}
              disabled={!input.trim() || sending || conversation.status === 'resolved'}
              size="icon"
              className="h-[60px] w-[60px]"
            >
              {sending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          {conversation.status === 'resolved' && (
            <p className="text-sm text-muted-foreground mt-2">
              This conversation has been resolved. No further responses can be sent.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
};
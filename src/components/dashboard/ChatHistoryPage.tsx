import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Search, Filter, Plus, ArrowLeft, Edit3, Check, X, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
interface Conversation {
  id: string;
  title: string;
  tags: string[];
  updated_at: string;
  created_at: string;
}
export const ChatHistoryPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [editingConversation, setEditingConversation] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editTags, setEditTags] = useState('');
  const [updating, setUpdating] = useState(false);
  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);
  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .order('updated_at', {
          ascending: false,
        });
      if (error) {
        console.error('Error loading conversations:', error);
        toast({
          title: 'Error',
          description: 'Failed to load chat history.',
          variant: 'destructive',
        });
      } else {
        setConversations(data || []);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load chat history.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  const deleteConversation = async (conversationId: string) => {
    try {
      const { error } = await supabase.from('chat_conversations').delete().eq('id', conversationId);
      if (error) throw error;
      loadConversations();
      toast({
        title: 'Conversation deleted',
        description: 'The conversation has been removed.',
      });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete conversation.',
        variant: 'destructive',
      });
    }
  };
  const updateConversationTitle = async (
    conversationId: string,
    newTitle: string,
    newTags: string[],
  ) => {
    setUpdating(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-chat-title', {
        body: {
          conversationId,
          title: newTitle,
          tags: newTags,
        },
      });
      if (error) throw error;

      // Update local state
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId
            ? {
                ...conv,
                title: newTitle,
                tags: newTags,
              }
            : conv,
        ),
      );
      toast({
        title: 'Title updated',
        description: 'Conversation title has been updated successfully.',
      });
      setEditingConversation(null);
    } catch (error) {
      console.error('Error updating title:', error);
      toast({
        title: 'Error',
        description: 'Failed to update conversation title.',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };
  const startEditing = (conversation: Conversation) => {
    setEditingConversation(conversation.id);
    setEditTitle(conversation.title);
    setEditTags(conversation.tags.join(', '));
  };
  const cancelEditing = () => {
    setEditingConversation(null);
    setEditTitle('');
    setEditTags('');
  };
  const saveTitle = () => {
    if (!editTitle.trim()) return;
    const tags = editTags
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter((tag) => tag.length > 0);
    updateConversationTitle(editingConversation!, editTitle.trim(), tags);
  };

  // Filter conversations based on search and tag
  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch =
      searchTerm === '' ||
      conv.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesTag = selectedTag === 'all' || conv.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  // Get all unique tags
  const allTags = [...new Set(conversations.flatMap((conv) => conv.tags))];
  const startNewChat = () => {
    navigate('/dashboard/chat');
  };
  return (
    <div className="page">
      <div className="page-title flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chat History</h1>
          <p className="text-muted-foreground">View and search your previous AI conversations</p>
        </div>
        <Button onClick={startNewChat} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      <div className="section-card">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Previous Conversations</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Search and review your chat history with the AI assistant
        </p>

        {/* Search and filter */}
        <div className="flex-gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedTag} onValueChange={setSelectedTag}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tags</SelectItem>
              {allTags.map((tag) => (
                <SelectItem key={tag} value={tag}>
                  {tag}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="h-[600px]">
          <div className="space-y-4">
            {loading ? (
              <div className="py-8 text-center">
                <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <p className="text-muted-foreground">Loading chat history...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="py-12 text-center">
                <MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">
                  {conversations.length === 0 ? 'No chat history yet' : 'No conversations found'}
                </h3>
                <p className="mb-4 text-muted-foreground">
                  {conversations.length === 0
                    ? 'Start a conversation to see your chat history here'
                    : 'Try adjusting your search or filter criteria'}
                </p>
                <Button onClick={startNewChat}>
                  {conversations.length === 0 ? 'Start New Conversation' : 'Start New Chat'}
                </Button>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  className="section-card-compact group transition-colors hover:bg-muted/50"
                >
                  {editingConversation === conv.id ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="edit-title">Title</Label>
                        <Input
                          id="edit-title"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="Enter conversation title"
                          maxLength={100}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
                        <Input
                          id="edit-tags"
                          value={editTags}
                          onChange={(e) => setEditTags(e.target.value)}
                          placeholder="e.g., compliance, incident-response, policy"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={saveTitle}
                          disabled={updating || !editTitle.trim()}
                          className="animate-fade-in"
                        >
                          <Check className="mr-1 h-4 w-4" />
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEditing}
                          disabled={updating}
                        >
                          <X className="mr-1 h-4 w-4" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div
                        className="min-w-0 flex-1 cursor-pointer"
                        onClick={() => navigate(`/dashboard?conversation=${conv.id}`)}
                      >
                        <div className="mb-1 flex items-center gap-2">
                          <h3 className="truncate font-medium">{conv.title}</h3>
                          {conv.tags.length > 0 && (
                            <Tag className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(conv.updated_at).toLocaleDateString()} at{' '}
                          {new Date(conv.updated_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        {conv.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {conv.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(conv);
                          }}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteConversation(conv.id);
                          }}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

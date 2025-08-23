import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Search, Edit3, Check, X, Tag, Plus } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { callFn } from '@/lib/call-fn';

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
    if (user) loadConversations();
  }, [user]);

  const loadConversations = async () => {
    try {
      const { data } = await callFn<{ conversations: Conversation[]; pagination: any }>(
        'chat-api/conversations?limit=200&offset=0',
        { method: 'GET' },
      );
      setConversations(data?.conversations || []);
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
      toast({ title: 'Conversation deleted', description: 'The conversation has been removed.' });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({ title: 'Error', description: 'Failed to delete conversation.', variant: 'destructive' });
    }
  };

  const updateConversationTitle = async (conversationId: string, newTitle: string, newTags: string[]) => {
    setUpdating(true);
    try {
      const { error } = await callFn('update-chat-title', {
        body: { conversationId, title: newTitle, tags: newTags },
      });
      if (error) throw error;

      setConversations((prev) =>
        prev.map((conv) => (conv.id === conversationId ? { ...conv, title: newTitle, tags: newTags } : conv)),
      );
      toast({ title: 'Title updated', description: 'Conversation title has been updated successfully.' });
      setEditingConversation(null);
    } catch (error) {
      console.error('Error updating title:', error);
      toast({ title: 'Error', description: 'Failed to update conversation title.', variant: 'destructive' });
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

  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch =
      searchTerm === '' ||
      conv.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesTag = selectedTag === 'all' || conv.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  const allTags = [...new Set(conversations.flatMap((conv) => conv.tags))];

  return (
    <div className="page">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Chat History</h1>
            <p className="text-muted-foreground">View and search your previous AI conversations</p>
          </div>
          <Button onClick={() => navigate('/dashboard/chat/new')} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Previous Conversations</h2>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Search and review your chat history with the AI assistant
          </p>

          {/* Search + filter */}
          <div className="mb-4 flex gap-4">
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
                  <Button onClick={() => navigate('/dashboard/chat/new')}>
                    {conversations.length === 0 ? 'Start New Conversation' : 'Start New Chat'}
                  </Button>
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <div key={conv.id} className="rounded-lg border p-4 transition-colors hover:bg-muted/50">
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
                          <Button size="sm" onClick={saveTitle} disabled={updating || !editTitle.trim()}>
                            <Check className="mr-1 h-4 w-4" />
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEditing} disabled={updating}>
                            <X className="mr-1 h-4 w-4" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div
                          className="min-w-0 flex-1 cursor-pointer"
                          onClick={() => navigate(`/dashboard/chat/c/${conv.id}`)}
                        >
                          <div className="mb-1 flex items-center gap-2">
                            <h3 className="truncate font-medium">{conv.title}</h3>
                            {conv.tags.length > 0 && <Tag className="h-3 w-3 text-muted-foreground" />}
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
                        <div className="ml-2 flex gap-1">
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
    </div>
  );
};

export default ChatHistoryPage;

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Search, Trash2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { Conversation } from './types';

type Props = {
  className?: string;
  filteredConversations: Conversation[];
  allTags: string[];
  selectedTag: string;
  setSelectedTag: (v: string) => void;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  startNewConversation: () => void;
  loadConversation: (conversationId: string) => void; // kept for compatibility
  deleteConversation: (conversationId: string) => Promise<void> | void;
  onBackToChat: () => void;
};

export const ChatHistoryPanel = ({
  className = '',
  filteredConversations,
  allTags,
  selectedTag,
  setSelectedTag,
  searchTerm,
  setSearchTerm,
  startNewConversation,
  loadConversation,
  deleteConversation,
  onBackToChat,
}: Props) => {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const navigate = useNavigate();

  const openConversation = (id: string) => {
    // Route-based navigation, then close panel
    navigate(`/dashboard/chat/c/${id}`);
    onBackToChat?.();
    // call old loader for backward-compat (no-op if it just navigates)
    loadConversation?.(id);
  };

  return (
    <div className={`mx-auto max-w-4xl ${className}`}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Chat History
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button onClick={startNewConversation} size="sm">
                New Chat
              </Button>
              <Button variant="outline" onClick={onBackToChat} size="sm">
                Back to Chat
              </Button>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4">
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
        </CardHeader>

        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-2">
              {filteredConversations.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <History className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p>No conversations found</p>
                  <Button onClick={startNewConversation} className="mt-4">
                    Start your first conversation
                  </Button>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const msgCount =
                    conv.chat_messages && (conv.chat_messages as any)[0]?.count != null
                      ? (conv.chat_messages as any)[0].count
                      : undefined;

                  return (
                    <div
                      key={conv.id}
                      className="group flex cursor-pointer items-center justify-between rounded-lg border border-transparent p-3 transition-colors hover:border-border hover:bg-muted/40"
                    >
                      <div className="min-w-0 flex-1" onClick={() => openConversation(conv.id)}>
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-sm font-medium">{conv.title}</h3>
                          {typeof msgCount === 'number' && (
                            <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                              <MessageSquare className="h-3 w-3" />
                              {msgCount}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                          Updated{' '}
                          {new Date(conv.updated_at).toLocaleDateString()}{' '}
                          •{' '}
                          {new Date(conv.updated_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        {(conv.tags || []).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {(conv.tags || []).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-[10px]">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Delete (confirm first) */}
                      <AlertDialog
                        open={pendingDeleteId === conv.id}
                        onOpenChange={(open) => !open && setPendingDeleteId(null)}
                      >
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="ml-3 opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPendingDeleteId(conv.id);
                            }}
                            aria-label="Delete conversation"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone.{' '}
                              {conv.title ? `“${conv.title}”` : 'The selected conversation'} will be
                              permanently removed.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={async () => {
                                setPendingDeleteId(null);
                                await deleteConversation(conv.id);
                              }}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

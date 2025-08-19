import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { FileText, MessageSquare, Shield, User, Eye, EyeOff, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContextPackViewerProps {
  contextPack: any;
  onRedact?: (items: string[]) => void;
  readOnly?: boolean;
}

export const ContextPackViewer = ({ contextPack, onRedact, readOnly = false }: ContextPackViewerProps) => {
  const [redactedItems, setRedactedItems] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('summary');

  if (!contextPack) return null;

  const handleRedactionChange = (itemKey: string, redacted: boolean) => {
    const newRedactedItems = redacted 
      ? [...redactedItems, itemKey]
      : redactedItems.filter(item => item !== itemKey);
    
    setRedactedItems(newRedactedItems);
    onRedact?.(newRedactedItems);
  };

  const renderMessages = () => {
    const messages = contextPack.messages || [];
    const isRedacted = redactedItems.includes('messages');
    
    if (isRedacted) {
      return <p className="text-muted-foreground italic">Messages redacted from context pack</p>;
    }

    return (
      <div className="space-y-2">
        {messages.slice(0, viewMode === 'summary' ? 3 : messages.length).map((message: any, index: number) => (
          <div key={index} className={cn(
            "p-2 rounded-md text-sm",
            message.role === 'user' ? "bg-primary/10" : "bg-muted"
          )}>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={message.role === 'user' ? "default" : "secondary"} className="text-xs">
                {message.role}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(message.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <p className="text-sm">{message.content.substring(0, 200)}{message.content.length > 200 ? '...' : ''}</p>
          </div>
        ))}
        {viewMode === 'summary' && messages.length > 3 && (
          <p className="text-xs text-muted-foreground">...and {messages.length - 3} more messages</p>
        )}
      </div>
    );
  };

  const renderUserProfile = () => {
    const profile = contextPack.user_profile || {};
    const isRedacted = redactedItems.includes('user_profile');
    
    if (isRedacted) {
      return <p className="text-muted-foreground italic">User profile redacted from context pack</p>;
    }

    return (
      <div className="space-y-2">
        {profile.company && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Company:</span>
            <span className="text-sm">{profile.company}</span>
          </div>
        )}
        {profile.industry && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Industry:</span>
            <span className="text-sm">{profile.industry}</span>
          </div>
        )}
        {profile.timezone && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Timezone:</span>
            <span className="text-sm">{profile.timezone}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Package className="h-4 w-4" />
          View Context Pack
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Escalation Context Pack
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'summary' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('summary')}
              >
                Summary
              </Button>
              <Button
                variant={viewMode === 'detailed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('detailed')}
              >
                Detailed
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-4 p-1">
            {/* AI Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  AI Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {contextPack.ai_summary || 'No summary available'}
                </p>
              </CardContent>
            </Card>

            {/* Framework Tags */}
            {contextPack.framework_tags?.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Framework Tags
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {contextPack.framework_tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary">
                        {tag.toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Detected Entities */}
            {contextPack.detected_entities?.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Detected Entities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {contextPack.detected_entities.map((entity: string) => (
                      <Badge key={entity} variant="outline" className="text-xs">
                        {entity}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Risk Flags */}
            {contextPack.risk_flags?.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-orange-600">Risk Flags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {contextPack.risk_flags.map((flag: string) => (
                      <Badge key={flag} variant="destructive" className="text-xs">
                        {flag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Messages */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Chat Messages ({contextPack.messages?.length || 0})
                  </CardTitle>
                  {!readOnly && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="redact-messages"
                        checked={redactedItems.includes('messages')}
                        onCheckedChange={(checked) => handleRedactionChange('messages', !!checked)}
                      />
                      <label htmlFor="redact-messages" className="text-xs cursor-pointer">
                        Redact
                      </label>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {renderMessages()}
              </CardContent>
            </Card>

            {/* User Profile */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4" />
                    User Profile
                  </CardTitle>
                  {!readOnly && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="redact-profile"
                        checked={redactedItems.includes('user_profile')}
                        onCheckedChange={(checked) => handleRedactionChange('user_profile', !!checked)}
                      />
                      <label htmlFor="redact-profile" className="text-xs cursor-pointer">
                        Redact
                      </label>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {renderUserProfile()}
              </CardContent>
            </Card>

            {/* Environment Notes */}
            {contextPack.environment_notes && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Environment Notes
                    </CardTitle>
                    {!readOnly && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="redact-env"
                          checked={redactedItems.includes('environment_notes')}
                          onCheckedChange={(checked) => handleRedactionChange('environment_notes', !!checked)}
                        />
                        <label htmlFor="redact-env" className="text-xs cursor-pointer">
                          Redact
                        </label>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {redactedItems.includes('environment_notes') ? (
                    <p className="text-muted-foreground italic">Environment notes redacted from context pack</p>
                  ) : (
                    <p className="text-sm">{contextPack.environment_notes}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Files */}
            {contextPack.files?.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Attached Files ({contextPack.files.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {contextPack.files.map((file: any, index: number) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm">{file.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {file.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Metadata */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Context Pack Metadata</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Version:</span> {contextPack.version}
                  </div>
                  <div>
                    <span className="font-medium">Created:</span> {new Date(contextPack.created_at).toLocaleString()}
                  </div>
                  <div>
                    <span className="font-medium">Messages:</span> {contextPack.messages?.length || 0}
                  </div>
                  <div>
                    <span className="font-medium">Files:</span> {contextPack.files?.length || 0}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        {!readOnly && redactedItems.length > 0 && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 text-sm">
              <EyeOff className="h-4 w-4 text-orange-500" />
              <span className="font-medium">Items redacted:</span>
              <div className="flex flex-wrap gap-1">
                {redactedItems.map(item => (
                  <Badge key={item} variant="outline" className="text-xs">
                    {item.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
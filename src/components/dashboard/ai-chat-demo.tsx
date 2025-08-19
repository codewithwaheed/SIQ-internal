import React, { useState, useEffect } from 'react';
import { Send, Bot, User, Paperclip, MoreVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const chatMessages = [
  {
    type: 'user',
    content: 'What are the NIST 800-171 requirements for access control?',
    timestamp: '2:34 PM',
  },
  {
    type: 'ai',
    content:
      'NIST 800-171 has several access control requirements under the AC family. Key requirements include:\n\n• AC.1.001: Limit system access to authorized users\n• AC.1.002: Limit system access to authorized functions\n• AC.1.003: Control information posted on publicly accessible systems\n\nWould you like me to elaborate on any specific requirement or help you draft an access control policy?',
    timestamp: '2:34 PM',
  },
  {
    type: 'user',
    content: 'Yes, help me draft a policy for AC.1.001',
    timestamp: '2:35 PM',
  },
];

export const AiChatDemo = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState(chatMessages);
  const [inputValue, setInputValue] = useState('');
  const [isOnline, setIsOnline] = useState(true);

  // Track feature usage
  const trackFeatureUsage = async (feature: string) => {
    if (!user) return;

    try {
      await supabase.functions.invoke('audit-log', {
        body: {
          action: 'FEATURE_USED',
          description: `Feature interaction: ${feature}`,
          metadata: { feature, location: 'marketing_demo' },
        },
      });
    } catch (error) {
      console.error('Error tracking feature usage:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    await trackFeatureUsage('ai_chat_demo');

    const newMessage = {
      type: 'user' as const,
      content: inputValue,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setMessages([...messages, newMessage]);
    setInputValue('');

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = {
        type: 'ai' as const,
        content:
          'This is a demo of our AI assistant. In the full version, I would provide detailed compliance guidance based on your specific question.',
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      setMessages((prev) => [...prev, aiResponse]);
    }, 1000);
  };

  return (
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <Badge className="mb-6 bg-accent/10 text-accent">AI Assistant Preview</Badge>
            <h2 className="mb-6 text-3xl font-bold text-foreground lg:text-4xl">
              Get instant compliance guidance
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Our AI assistant is trained on the latest cybersecurity frameworks and regulations.
              Ask questions in natural language and get expert-level guidance instantly.
            </p>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 rounded-full bg-success"></div>
                <span className="text-foreground">Trained on NIST 800-171, CMMC 2.0, FedRAMP</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 rounded-full bg-success"></div>
                <span className="text-foreground">Updated regularly with latest guidance</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 rounded-full bg-success"></div>
                <span className="text-foreground">
                  Contextual understanding of your environment
                </span>
              </div>
            </div>
          </div>
          <div>
            <Card className="shadow-elevated">
              <CardHeader className="border-b border-border">
                <CardTitle className="flex items-center space-x-2">
                  <Bot className="h-5 w-5 text-accent" />
                  <span>Compliance Assistant</span>
                  <Badge variant="outline" className="ml-auto">
                    {isOnline ? 'Online' : 'Demo'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-96 space-y-4 overflow-y-auto p-4">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`flex max-w-xs space-x-2 lg:max-w-md ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
                      >
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full ${
                            message.type === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-accent text-accent-foreground'
                          }`}
                        >
                          {message.type === 'user' ? (
                            <User className="h-4 w-4" />
                          ) : (
                            <Bot className="h-4 w-4" />
                          )}
                        </div>
                        <div
                          className={`rounded-lg p-3 ${
                            message.type === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-foreground'
                          }`}
                        >
                          <p className="whitespace-pre-line text-sm">{message.content}</p>
                          <p
                            className={`mt-1 text-xs ${
                              message.type === 'user'
                                ? 'text-primary-foreground/70'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {message.timestamp}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border p-4">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Try the demo - ask about compliance..."
                      className="flex-1"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => trackFeatureUsage('document_attachment_demo')}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      className="bg-accent hover:bg-accent/90"
                      onClick={handleSendMessage}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

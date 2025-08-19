import { useState, useEffect } from 'react';
import { AlertTriangle, Shield, FileText, Clock, MessageSquare, TrendingUp, Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EscalationButton } from './EscalationButton';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  id?: string;
}

interface EscalationTrigger {
  id: string;
  type: 'ai-suggested' | 'threshold' | 'document-based' | 'pattern-based';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  reason: string;
  contextHint: string;
  icon: React.ComponentType<{ className?: string }>;
  dismissible: boolean;
}

interface SmartEscalationTriggersProps {
  messages: Message[];
  uploadedDocuments?: any[];
  conversationContext: {
    documentCount: number;
    messageCount: number;
  };
  sessionStart: Date;
  onDismiss?: (triggerId: string) => void;
}

// Pattern detection functions
const detectUrgencyWords = (content: string): boolean => {
  const urgencyWords = [
    'urgent', 'emergency', 'critical', 'asap', 'immediately', 'breach', 'attack', 
    'compromised', 'incident', 'malware', 'ransomware', 'hack', 'vulnerability',
    'deadline', 'audit', 'compliance', 'violation', 'penalty', 'fine'
  ];
  return urgencyWords.some(word => content.toLowerCase().includes(word));
};

const detectRegulatoryKeywords = (content: string): boolean => {
  const regulatoryTerms = [
    'gdpr', 'hipaa', 'sox', 'pci dss', 'iso 27001', 'nist', 'cmmc', 'fedramp',
    'compliance', 'regulation', 'audit', 'certification', 'framework',
    'data protection', 'privacy', 'personal data', 'pii', 'phi'
  ];
  return regulatoryTerms.some(term => content.toLowerCase().includes(term));
};

const detectComplexitySignals = (content: string): boolean => {
  const complexityIndicators = [
    'not sure', 'confused', 'complicated', 'complex', 'difficult', 'help',
    'explain', "don't understand", 'clarify', 'multiple', 'various',
    'enterprise', 'organization', 'infrastructure', 'architecture'
  ];
  return complexityIndicators.some(indicator => content.toLowerCase().includes(indicator));
};

const detectRepeatedQuestions = (messages: Message[]): boolean => {
  if (messages.length < 4) return false;
  
  const recentUserMessages = messages
    .filter(m => m.role === 'user')
    .slice(-3)
    .map(m => m.content.toLowerCase());
    
  const questionWords = ['how', 'what', 'why', 'when', 'where', 'can', 'should', 'is', 'are'];
  const hasQuestions = recentUserMessages.filter(msg => 
    questionWords.some(word => msg.includes(word + ' ')) || msg.includes('?')
  );
  
  return hasQuestions.length >= 2;
};

const detectBlockedTasks = (content: string): boolean => {
  const blockageSignals = [
    "can't", "cannot", "unable", "impossible", "blocked", "stuck", "issue", "problem",
    "error", "failed", "doesn't work", "not working", "broken", "won't"
  ];
  return blockageSignals.some(signal => content.toLowerCase().includes(signal));
};

const detectHighRiskScenarios = (content: string): boolean => {
  const highRiskTerms = [
    'data breach', 'security incident', 'unauthorized access', 'data leak',
    'insider threat', 'phishing', 'social engineering', 'zero day',
    'advanced persistent threat', 'apt', 'nation state', 'cyber attack'
  ];
  return highRiskTerms.some(term => content.toLowerCase().includes(term));
};

const detectSensitiveDocumentContext = (documents: any[]): boolean => {
  if (!documents || documents.length === 0) return false;
  
  const sensitiveIndicators = [
    'confidential', 'sensitive', 'classified', 'restricted', 'internal',
    'financial', 'medical', 'personal', 'policy', 'procedure', 'contract'
  ];
  
  return documents.some(doc => 
    sensitiveIndicators.some(indicator => 
      doc.file_name.toLowerCase().includes(indicator) ||
      (doc.content_extracted && doc.content_extracted.toLowerCase().includes(indicator))
    )
  );
};

export const SmartEscalationTriggers = ({
  messages,
  uploadedDocuments = [],
  conversationContext,
  sessionStart,
  onDismiss
}: SmartEscalationTriggersProps) => {
  const [activeTriggers, setActiveTriggers] = useState<EscalationTrigger[]>([]);
  const [dismissedTriggers, setDismissedTriggers] = useState<Set<string>>(new Set());
  const [lastTriggerMessageCount, setLastTriggerMessageCount] = useState(0);

  useEffect(() => {
    analyzeTriggers();
  }, [messages, uploadedDocuments, conversationContext]);

  const analyzeTriggers = () => {
    const newTriggers: EscalationTrigger[] = [];
    const lastMessage = messages[messages.length - 1];
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    const assistantMessagesSinceLastTrigger = conversationContext.messageCount - lastTriggerMessageCount;

    // Respect the "no nagging" constraint - only show new triggers after 3 assistant replies
    if (assistantMessagesSinceLastTrigger < 3 && activeTriggers.length > 0) {
      return;
    }

    if (!lastMessage || !lastUserMessage) return;

    // AI-Suggested Triggers (High Priority)
    if (detectHighRiskScenarios(lastUserMessage.content)) {
      newTriggers.push({
        id: 'high-risk-scenario',
        type: 'ai-suggested',
        priority: 'urgent',
        title: 'High-Risk Security Scenario Detected',
        reason: 'This appears to involve a potential security incident that requires immediate expert attention.',
        contextHint: 'Connect with our incident response team',
        icon: AlertTriangle,
        dismissible: false
      });
    }

    if (detectRegulatoryKeywords(lastUserMessage.content)) {
      newTriggers.push({
        id: 'regulatory-compliance',
        type: 'ai-suggested',
        priority: 'high',
        title: 'Compliance & Regulatory Matter',
        reason: 'Regulatory compliance questions often require specialized expertise and current knowledge of requirements.',
        contextHint: 'Escalate for compliance guidance',
        icon: Shield,
        dismissible: true
      });
    }

    // Document-Based Triggers
    if (detectSensitiveDocumentContext(uploadedDocuments)) {
      newTriggers.push({
        id: 'sensitive-documents',
        type: 'document-based',
        priority: 'medium',
        title: 'Sensitive Document Analysis',
        reason: 'You\'ve uploaded sensitive documents that may benefit from expert review and specific guidance.',
        contextHint: 'Get expert document review',
        icon: FileText,
        dismissible: true
      });
    }

    // Threshold Triggers
    if (detectUrgencyWords(lastUserMessage.content)) {
      newTriggers.push({
        id: 'urgency-detected',
        type: 'threshold',
        priority: 'high',
        title: 'Urgent Matter Detected',
        reason: 'Your message indicates this is time-sensitive and may require immediate expert assistance.',
        contextHint: 'Get urgent expert help',
        icon: Clock,
        dismissible: true
      });
    }

    if (detectRepeatedQuestions(messages)) {
      newTriggers.push({
        id: 'repeated-questions',
        type: 'pattern-based',
        priority: 'medium',
        title: 'Complex Topic Discussion',
        reason: 'Multiple follow-up questions suggest this topic might benefit from direct expert consultation.',
        contextHint: 'Escalate for detailed explanation',
        icon: MessageSquare,
        dismissible: true
      });
    }

    if (detectBlockedTasks(lastUserMessage.content)) {
      newTriggers.push({
        id: 'blocked-task',
        type: 'threshold',
        priority: 'medium',
        title: 'Implementation Challenge',
        reason: 'It sounds like you\'re encountering implementation difficulties that an expert could help resolve.',
        contextHint: 'Get hands-on implementation help',
        icon: TrendingUp,
        dismissible: true
      });
    }

    // Session-Based Triggers
    const sessionDuration = (new Date().getTime() - sessionStart.getTime()) / (1000 * 60); // minutes
    if (sessionDuration > 15 && conversationContext.messageCount > 8) {
      newTriggers.push({
        id: 'extended-session',
        type: 'pattern-based',
        priority: 'low',
        title: 'Extended Consultation Session',
        reason: 'You\'ve been exploring this topic extensively. An expert consultation might provide more efficient guidance.',
        contextHint: 'Switch to expert consultation',
        icon: Eye,
        dismissible: true
      });
    }

    // Filter out dismissed triggers and duplicates
    const filteredTriggers = newTriggers.filter(trigger => 
      !dismissedTriggers.has(trigger.id) && 
      !activeTriggers.some(active => active.id === trigger.id)
    );

    // Limit to highest priority triggers (max 2 at once)
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
    const sortedTriggers = filteredTriggers
      .sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])
      .slice(0, 2);

    if (sortedTriggers.length > 0) {
      setActiveTriggers(sortedTriggers);
      setLastTriggerMessageCount(conversationContext.messageCount);
    }
  };

  const handleDismiss = (triggerId: string) => {
    setDismissedTriggers(prev => new Set([...prev, triggerId]));
    setActiveTriggers(prev => prev.filter(t => t.id !== triggerId));
    onDismiss?.(triggerId);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800';
      case 'high': return 'bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800';
      case 'medium': return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800';
      case 'low': return 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800';
      default: return 'bg-muted border-border';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return null;

  return (
    <div className="space-y-3 mt-4">
      {activeTriggers.map((trigger) => {
        const IconComponent = trigger.icon;
        
        return (
          <Card 
            key={trigger.id} 
            className={cn(
              'transition-all duration-200 hover:shadow-sm',
              getPriorityColor(trigger.priority)
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={cn(
                  'rounded-full p-2 shrink-0',
                  trigger.priority === 'urgent' ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400' :
                  trigger.priority === 'high' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400' :
                  trigger.priority === 'medium' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400' :
                  'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                )}>
                  <IconComponent className="h-4 w-4" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium text-sm text-foreground">{trigger.title}</h4>
                    <Badge 
                      variant="secondary" 
                      className={cn('text-xs px-2 py-0.5', getPriorityBadgeColor(trigger.priority))}
                    >
                      {trigger.priority}
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                    {trigger.reason}
                  </p>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <EscalationButton 
                      messages={messages} 
                      variant="inline"
                    />
                    
                    {trigger.dismissible && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDismiss(trigger.id)}
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Dismiss
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
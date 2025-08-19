import { useState, useRef, useEffect } from "react";
import { ArrowRight, Sparkles, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { AiAvatar } from '@/components/ui/ai-avatar';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
export const HomepageChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const {
    toast
  } = useToast();
  const renderFormattedText = (content: string) => {
    // Simple text formatting without markdown dependency
    return content
      .split('\n')
      .map((line, index) => {
        // Handle bold text
        if (line.includes('**')) {
          const parts = line.split('**');
          return (
            <p key={index} className="mb-3 leading-relaxed">
              {parts.map((part, i) => 
                i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part
              )}
            </p>
          );
        }
        
        // Handle bullet points
        if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
          return (
            <li key={index} className="mb-1 ml-4 leading-relaxed">
              {line.replace(/^[•\-]\s*/, '')}
            </li>
          );
        }
        
        // Handle empty lines
        if (line.trim() === '') {
          return <br key={index} />;
        }
        
        // Regular paragraphs
        return <p key={index} className="mb-3 leading-relaxed">{line}</p>;
      });
  };
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });
  };
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollToBottom(), 100);
    }
  }, [messages]);
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 100) + 'px';
    }
  }, [input]);
  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    // Count user messages to limit demo interactions
    const userMessageCount = messages.filter(msg => msg.role === 'user').length;
    if (userMessageCount >= 3) {
      return; // Prevent sending more messages
    }

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    const messageToSend = input;
    setInput("");
    setLoading(true);

    // Create streaming message placeholder
    const streamingMessage: Message = {
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
    setMessages(prev => [...prev, streamingMessage]);

    try {
      // Simple demo responses to simulate AI behavior
      const demoResponses = {
        'soc': `**SOC 2 Type I vs Type II Overview**

SOC 2 Type I and Type II are both compliance frameworks, but they differ in scope and timing:

**SOC 2 Type I:**
- Point-in-time assessment
- Evaluates design of controls at a specific date
- Faster to complete (2-4 weeks)
- Less comprehensive but good starting point

**SOC 2 Type II:**
- Covers 3-12 month period
- Tests both design AND operational effectiveness
- More rigorous and comprehensive
- Required by most enterprise customers

**Which should you choose?**
- Start with Type I if you're new to SOC 2
- Move to Type II for serious compliance needs
- Type II is what most customers actually want to see

Would you like help planning your SOC 2 implementation strategy?`,

        'cmmc': `**Getting Started with CMMC Compliance**

CMMC (Cybersecurity Maturity Model Certification) is required for DOD contractors. Here's your roadmap:

**Step 1: Determine Your Level**
- Level 1: Basic cyber hygiene (17 practices)
- Level 2: Intermediate (110 practices) - most common
- Level 3: Expert/Advanced (110+ practices)

**Step 2: Gap Assessment**
- Document current security controls
- Identify missing requirements
- Prioritize remediation efforts

**Step 3: Implementation**
- Implement missing controls
- Document policies and procedures
- Train your workforce

**Key Focus Areas:**
- Access control and identity management
- Incident response capabilities
- Security awareness training
- Supply chain risk management

Need help with a specific CMMC level or practice area?`,

        'hipaa': `**Key HIPAA Compliance Requirements**

HIPAA protects patient health information through several key requirements:

**Administrative Safeguards:**
- Designate a Security Officer
- Conduct regular risk assessments
- Implement workforce training programs
- Create incident response procedures

**Physical Safeguards:**
- Secure facilities and workstations
- Control physical access to systems
- Proper disposal of PHI-containing media

**Technical Safeguards:**
- Access controls and user authentication
- Audit logging and monitoring
- Encryption of PHI in transit and at rest
- Secure communications

**Business Associate Agreements:**
- Required for all third-party vendors
- Must include specific HIPAA language
- Regular compliance monitoring

**Risk Assessment is Critical:**
- Required annually at minimum
- Document all findings and remediation
- Update security measures based on results

Which area would you like to dive deeper into?`,

        'incident': `**Creating an Incident Response Plan**

An effective incident response plan is crucial for cybersecurity resilience:

**Phase 1: Preparation**
- Establish incident response team
- Define roles and responsibilities
- Create communication templates
- Set up monitoring and detection tools

**Phase 2: Detection & Analysis**
- Monitor for security events
- Classify incident severity levels
- Document all findings
- Determine scope and impact

**Phase 3: Containment & Recovery**
- Immediate containment actions
- Evidence preservation
- System restoration procedures
- Business continuity measures

**Phase 4: Post-Incident**
- Lessons learned documentation
- Plan updates and improvements
- Stakeholder communication
- Legal and regulatory reporting

**Key Success Factors:**
- Regular testing and tabletop exercises
- Clear escalation procedures
- Pre-approved communication plans
- Integration with business continuity

Would you like help developing any specific phase of your incident response plan?`
      };

      // Determine response based on input content and conversation context
      let responseContent = '';
      const inputLower = messageToSend.toLowerCase();
      
      // Check for specific framework questions
      if (inputLower.includes('soc')) {
        responseContent = demoResponses.soc;
      } else if (inputLower.includes('cmmc')) {
        responseContent = demoResponses.cmmc;
      } else if (inputLower.includes('hipaa')) {
        responseContent = demoResponses.hipaa;
      } else if (inputLower.includes('incident')) {
        responseContent = demoResponses.incident;
      } 
      // Handle confirmations and follow-ups by looking at previous context
      else if (/^(yes|yeah|yep|sure|okay|ok|that sounds good|sounds great|please|go ahead|continue)$/i.test(inputLower.trim())) {
        // Look at the last assistant message to understand context
        const lastAssistantMessage = messages.filter(m => m.role === 'assistant').pop();
        if (lastAssistantMessage?.content.includes('implementation strategy')) {
          responseContent = `**SOC 2 Implementation Roadmap**

Here's your step-by-step implementation strategy:

**Phase 1: Readiness Assessment (Weeks 1-2)**
- Gap analysis against SOC 2 requirements
- Identify current security controls
- Document scope and boundaries
- Resource planning and timeline

**Phase 2: Control Implementation (Weeks 3-8)**
- Access management and authentication
- System monitoring and logging
- Data encryption and backup procedures
- Vendor management and contracts

**Phase 3: Evidence Collection (Weeks 9-12)**
- Document control operations
- Collect supporting evidence
- Internal testing and validation
- Pre-audit readiness review

**Phase 4: Audit Preparation (Weeks 13-16)**
- Select qualified auditor
- Schedule audit timeline
- Final evidence package review
- Stakeholder communication plan

**Estimated Timeline:** 3-4 months for Type I, 6-12 months for Type II

Would you like me to break down any specific phase in more detail?`;
        } else if (lastAssistantMessage?.content.includes('specific CMMC level')) {
          responseContent = `**CMMC Level 2 Deep Dive**

Most contractors need Level 2 (110 practices across 17 domains):

**Critical Implementation Areas:**

**Access Control (AC)**
- Multi-factor authentication required
- Least privilege access principles
- Regular access reviews and revocation

**Audit and Accountability (AU)**
- Comprehensive logging and monitoring
- Log retention for at least 1 year
- Automated alerting for security events

**Configuration Management (CM)**
- Baseline configurations for all systems
- Change control processes
- Regular vulnerability scanning

**Identification and Authentication (IA)**
- Strong password policies
- Account lockout mechanisms
- Session timeout controls

**System and Communications Protection (SC)**
- Network segmentation and firewalls
- Encryption in transit and at rest
- Secure remote access solutions

Need help with implementation planning for any of these domains?`;
        } else if (lastAssistantMessage?.content.includes('dive deeper')) {
          responseContent = `**HIPAA Risk Assessment Framework**

Let's focus on conducting effective HIPAA risk assessments:

**Step 1: Asset Inventory**
- Identify all systems that store, process, or transmit PHI
- Map data flows between systems and partners
- Document physical and virtual infrastructure

**Step 2: Threat Assessment**
- External threats (hackers, malware, natural disasters)
- Internal threats (employees, contractors, human error)
- Technical vulnerabilities and system weaknesses

**Step 3: Risk Analysis**
- Likelihood of threat occurrence
- Potential impact on PHI confidentiality, integrity, availability
- Current security measures effectiveness

**Step 4: Risk Management**
- Prioritize risks by likelihood and impact
- Implement appropriate safeguards
- Document remediation decisions and residual risks

**Annual Review Requirements:**
- Update risk assessment annually or when significant changes occur
- Document all findings and remediation efforts
- Review and update security policies based on results

Would you like templates for conducting any of these assessment steps?`;
        } else {
          responseContent = `I'd be happy to provide more specific guidance! Could you clarify what aspect you'd like me to elaborate on from our previous discussion?`;
        }
      }
      // Default response for new topics
      else {
        responseContent = `I can help you with cybersecurity compliance frameworks and implementation strategies. Some areas I specialize in:

• **SOC 2** - Service Organization Control requirements and audit preparation
• **NIST 800-171** - Protecting Controlled Unclassified Information for contractors
• **HIPAA** - Healthcare data protection and risk assessment requirements  
• **CMMC** - DOD contractor cybersecurity certification requirements
• **FedRAMP** - Cloud security authorization for government systems

I can also assist with:
• Risk assessments and gap analyses
• Security policy and procedure development
• Incident response planning and tabletop exercises
• Security awareness training program development

What specific compliance challenge or security question can I help you with?`;
      }

      // Simulate streaming response
      let currentIndex = 0;
      const streamInterval = setInterval(() => {
        const chunkSize = Math.floor(Math.random() * 20) + 10; // Random chunk size
        const chunk = responseContent.slice(currentIndex, currentIndex + chunkSize);
        
        if (chunk) {
          currentIndex += chunkSize;
          setMessages(prev => prev.map((msg, idx) => 
            idx === prev.length - 1 
              ? { ...msg, content: responseContent.slice(0, currentIndex) }
              : msg
          ));
        } else {
          clearInterval(streamInterval);
          setLoading(false);
          setTimeout(() => scrollToBottom(), 100);
        }
      }, 50);

    } catch (error) {
      console.error('Chat error:', error);
      // Remove the streaming message on error
      setMessages(prev => prev.slice(0, -1));
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive"
      });
      setLoading(false);
    }
  };
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  const demoQuestions = ["SOC 2 Type I vs Type II differences?", "Getting started with CMMC compliance", "Key HIPAA compliance requirements", "Create an incident response plan"];
  if (messages.length === 0) {
    return <div className="max-w-4xl mx-auto">
        {/* Welcome Message */}
        <Card className="bg-gradient-to-r from-background/80 to-muted/20 backdrop-blur-sm border-border/50 shadow-lg mb-8">
          <CardContent className="p-8">
            <div className="flex items-start gap-4">
              <AiAvatar />
              <div className="flex-1">
                <div className="bg-muted/30 rounded-2xl p-6 border border-border/30">
                  <p className="text-foreground leading-relaxed mb-4">
                    👋 Hello! I'm your virtual CISO, powered by years of cybersecurity compliance expertise. I can help you navigate frameworks like <strong>SOC 2</strong>, <strong>NIST</strong>, <strong>HIPAA</strong>, <strong>CMMC</strong>, and more.
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Ask me anything about cybersecurity compliance, risk assessment, or security strategy.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Start Questions */}
        <div className="mb-6 sm:mb-8">
          <p className="text-center text-muted-foreground mb-4 font-medium">Try asking about:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            {demoQuestions.map((question, idx) => <Button key={idx} variant="outline" onClick={() => setInput(question)} className="h-auto p-3 sm:p-4 text-left bg-background/50 hover:bg-muted/50 border-border/50 hover:border-accent/30 transition-all touch-manipulation">
                <div className="text-sm break-words">{question}</div>
              </Button>)}
          </div>
        </div>

        {/* Input Area */}
        <Card className="bg-card/80 backdrop-blur-sm border-border/50 shadow-lg">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-end gap-2 sm:gap-3">
              <div className="flex-1 relative min-w-0">
                <Textarea ref={inputRef} placeholder="Ask your virtual CISO anything about cybersecurity compliance..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyPress} disabled={loading} className="min-h-[48px] max-h-[100px] resize-none border border-border/30 bg-background/50 text-base placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-accent focus-visible:border-accent px-3 sm:px-4 py-3 rounded-xl transition-all touch-manipulation" />
              </div>
              <Button size="icon" onClick={handleSendMessage} disabled={loading || !input.trim()} className={`h-12 w-12 sm:h-12 sm:w-12 rounded-xl transition-all duration-200 touch-manipulation ${loading ? 'bg-muted text-muted-foreground cursor-not-allowed' : input.trim() ? 'bg-accent hover:bg-accent/90 text-white shadow-md hover:shadow-lg hover:scale-105' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                {loading ? <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" /> : <ArrowRight className="h-5 w-5" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>;
  }
  const userMessageCount = messages.filter(msg => msg.role === 'user').length;
  const hasReachedLimit = userMessageCount >= 3;
  return <div className="max-w-4xl mx-auto">
      {/* Messages Container */}
      <Card className="bg-background/80 backdrop-blur-sm border-border/50 shadow-lg mb-6">
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-4 sm:space-y-6 max-h-[400px] sm:max-h-[500px] overflow-y-auto">
            {messages.map((message, index) => <div key={index} className={`flex gap-3 sm:gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {message.role === 'assistant' && <AiAvatar />}
                {message.role === 'user' && <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-accent text-white">
                    <div className="h-4 w-4 rounded-full bg-current" />
                  </div>}
                <div className={`flex flex-col max-w-[85%] sm:max-w-[80%] min-w-0 ${message.role === 'user' ? 'items-end' : ''}`}>
                  <div className={`p-3 sm:p-4 rounded-2xl ${message.role === 'user' ? 'bg-accent text-white' : 'bg-muted/30 border border-border/30 text-foreground'}`}>
                    {message.role === 'user' ? (
                      <p className="whitespace-pre-wrap leading-relaxed text-sm break-words">{message.content}</p>
                    ) : (
                      <div className="text-foreground space-y-1">
                        {renderFormattedText(message.content)}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 px-1">
                    {message.timestamp}
                  </p>
                </div>
              </div>)}
            
            {loading && <div className="flex gap-4">
                <AiAvatar />
                <div className="bg-muted/30 border border-border/30 rounded-2xl p-4">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{
                  animationDelay: '0.1s'
                }}></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{
                  animationDelay: '0.2s'
                }}></div>
                  </div>
                </div>
              </div>}
            
            <div ref={messagesEndRef} />
          </div>
        </CardContent>
      </Card>

      {/* Input Area or Signup Prompt */}
      {hasReachedLimit ? <Card className="bg-gradient-to-r from-accent/10 to-primary/10 backdrop-blur-sm border-accent/30 shadow-lg">
          <CardContent className="p-6 text-center">
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-accent" />
                <h3 className="text-lg font-semibold text-foreground">Demo limit reached</h3>
              </div>
              <p className="text-muted-foreground">
                You've experienced a taste of our AI-powered compliance assistance. 
                Sign up to continue conversations with unlimited messages and access to expert escalation.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-2">
                <Button asChild className="bg-accent hover:bg-accent/90 text-white">
                  <a href="/auth">Get Started Free</a>
                </Button>
                
              </div>
            </div>
          </CardContent>
        </Card> : <Card className="bg-card/80 backdrop-blur-sm border-border/50 shadow-lg">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-end gap-2 sm:gap-3">
              <div className="flex-1 relative min-w-0">
                <Textarea ref={inputRef} placeholder="Continue the conversation..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyPress} disabled={loading} className="min-h-[48px] max-h-[100px] resize-none border border-border/30 bg-background/50 text-base placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-accent focus-visible:border-accent px-3 sm:px-4 py-3 rounded-xl transition-all touch-manipulation" />
              </div>
              <Button size="icon" onClick={handleSendMessage} disabled={loading || !input.trim()} className={`h-12 w-12 sm:h-12 sm:w-12 rounded-xl transition-all duration-200 touch-manipulation ${loading ? 'bg-muted text-muted-foreground cursor-not-allowed' : input.trim() ? 'bg-accent hover:bg-accent/90 text-white shadow-md hover:shadow-lg hover:scale-105' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                {loading ? <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" /> : <ArrowRight className="h-5 w-5" />}
              </Button>
            </div>
          </CardContent>
        </Card>}
    </div>;
};
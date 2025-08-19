import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  AlertTriangle, 
  Calendar, 
  Clock, 
  User, 
  Video, 
  FileText, 
  CheckCircle,
  MessageSquare,
  ArrowUp,
  Phone
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Base container for escalation UI elements
interface EscalationContainerProps {
  children: ReactNode;
  className?: string;
}

export function EscalationContainer({ children, className }: EscalationContainerProps) {
  return (
    <div className={cn("space-y-4 max-w-sm mx-auto sm:max-w-none", className)}>
      {children}
    </div>
  );
}

// Reusable escalate button component
interface EscalateButtonProps {
  variant?: 'primary' | 'secondary' | 'minimal';
  size?: 'sm' | 'md' | 'lg';
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function EscalateButton({ 
  variant = 'primary', 
  size = 'md', 
  onClick, 
  disabled,
  className 
}: EscalateButtonProps) {
  const baseClasses = "touch-manipulation min-h-[48px] font-medium";
  
  const variantClasses = {
    primary: "bg-red-500 hover:bg-red-600 text-white shadow-lg",
    secondary: "bg-white border-2 border-red-500 text-red-500 hover:bg-red-50",
    minimal: "text-red-500 hover:text-red-600 hover:bg-red-50"
  };

  const sizeClasses = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-3 text-base",
    lg: "px-6 py-4 text-lg"
  };

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      <ArrowUp className="h-4 w-4 mr-2" />
      Escalate to Expert
    </Button>
  );
}

// Intake card for escalation form
interface IntakeCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function IntakeCard({ title, description, children, className }: IntakeCardProps) {
  return (
    <Card className={cn("border-orange-200 bg-orange-50/30", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <AlertTriangle className="h-5 w-5" />
          {title}
        </CardTitle>
        {description && (
          <p className="text-sm text-orange-700">{description}</p>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {children}
      </CardContent>
    </Card>
  );
}

// Status chip component
interface StatusChipProps {
  status: 'submitted' | 'routing' | 'assigned' | 'in_progress' | 'awaiting_user' | 'resolved' | 'closed';
  slaDeadline?: string;
  consultant?: {
    name: string;
    avatar?: string;
  };
  onClick?: () => void;
  className?: string;
}

export function StatusChip({ status, slaDeadline, consultant, onClick, className }: StatusChipProps) {
  const statusConfig = {
    submitted: { color: 'bg-blue-500', label: 'Submitted', icon: Clock },
    routing: { color: 'bg-yellow-500', label: 'Finding Expert', icon: User },
    assigned: { color: 'bg-purple-500', label: 'Assigned', icon: User },
    in_progress: { color: 'bg-green-500', label: 'In Progress', icon: MessageSquare },
    awaiting_user: { color: 'bg-orange-500', label: 'Awaiting You', icon: Clock },
    resolved: { color: 'bg-green-600', label: 'Resolved', icon: CheckCircle },
    closed: { color: 'bg-gray-500', label: 'Closed', icon: CheckCircle }
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div 
      className={cn(
        "inline-flex items-center gap-2 px-3 py-2 rounded-full text-white text-sm font-medium cursor-pointer transition-transform active:scale-95",
        config.color,
        onClick && "hover:opacity-90",
        className
      )}
      onClick={onClick}
    >
      <StatusIcon className="h-3 w-3" />
      <span>{config.label}</span>
      {consultant && (
        <Avatar className="h-5 w-5 border border-white/20">
          <AvatarImage src={consultant.avatar} />
          <AvatarFallback className="text-xs bg-white/20">
            {consultant.name.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

// Expert card component
interface ExpertCardProps {
  expert: {
    name: string;
    title: string;
    avatar?: string;
    expertise: string[];
    responseTime?: string;
  };
  onMessage?: () => void;
  onSchedule?: () => void;
  className?: string;
}

export function ExpertCard({ expert, onMessage, onSchedule, className }: ExpertCardProps) {
  return (
    <Card className={cn("border-blue-200 bg-blue-50/30", className)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={expert.avatar} />
            <AvatarFallback className="bg-blue-500 text-white">
              {expert.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-blue-900">{expert.name}</h3>
            <p className="text-sm text-blue-700">{expert.title}</p>
            {expert.responseTime && (
              <p className="text-xs text-blue-600 mt-1">
                Avg. response: {expert.responseTime}
              </p>
            )}
            <div className="flex flex-wrap gap-1 mt-2">
              {expert.expertise.slice(0, 3).map((skill) => (
                <Badge key={skill} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {expert.expertise.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{expert.expertise.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          {onMessage && (
            <Button size="sm" variant="outline" onClick={onMessage} className="flex-1 h-9">
              <MessageSquare className="h-3 w-3 mr-1" />
              Message
            </Button>
          )}
          {onSchedule && (
            <Button size="sm" onClick={onSchedule} className="flex-1 h-9">
              <Calendar className="h-3 w-3 mr-1" />
              Schedule
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Meeting card component
interface MeetingCardProps {
  meeting: {
    id: string;
    title: string;
    type: 'video' | 'audio' | 'screen_share';
    scheduledAt: string;
    duration: number;
    consultant: {
      name: string;
      avatar?: string;
    };
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
    meetingUrl?: string;
  };
  onJoin?: () => void;
  onReschedule?: () => void;
  className?: string;
}

export function MeetingCard({ meeting, onJoin, onReschedule, className }: MeetingCardProps) {
  const typeIcons = {
    video: Video,
    audio: Phone,
    screen_share: FileText
  };

  const TypeIcon = typeIcons[meeting.type];
  
  const statusColors = {
    scheduled: 'border-blue-200 bg-blue-50/30',
    in_progress: 'border-green-200 bg-green-50/30',
    completed: 'border-gray-200 bg-gray-50/30',
    cancelled: 'border-red-200 bg-red-50/30'
  };

  return (
    <Card className={cn(statusColors[meeting.status], className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <TypeIcon className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">{meeting.title}</span>
          </div>
          <Badge 
            variant="secondary" 
            className={cn(
              "text-xs",
              meeting.status === 'scheduled' && "bg-blue-100 text-blue-700",
              meeting.status === 'in_progress' && "bg-green-100 text-green-700"
            )}
          >
            {meeting.status.replace('_', ' ')}
          </Badge>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3" />
            <span>{new Date(meeting.scheduledAt).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            <span>{meeting.duration} minutes</span>
          </div>
          <div className="flex items-center gap-2">
            <Avatar className="h-4 w-4">
              <AvatarImage src={meeting.consultant.avatar} />
              <AvatarFallback className="text-xs">
                {meeting.consultant.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <span>{meeting.consultant.name}</span>
          </div>
        </div>

        {meeting.status === 'scheduled' && (
          <div className="flex gap-2 mt-4">
            {onJoin && meeting.meetingUrl && (
              <Button size="sm" onClick={onJoin} className="flex-1 h-9">
                <Video className="h-3 w-3 mr-1" />
                Join Meeting
              </Button>
            )}
            {onReschedule && (
              <Button size="sm" variant="outline" onClick={onReschedule} className="h-9">
                <Calendar className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Deliverable card component
interface DeliverableCardProps {
  deliverable: {
    id: string;
    title: string;
    type: 'document' | 'checklist' | 'policy' | 'next_steps';
    description: string;
    createdAt: string;
    consultant: {
      name: string;
      avatar?: string;
    };
    attachments?: Array<{
      name: string;
      size: number;
      url: string;
    }>;
  };
  onView?: () => void;
  onDownload?: () => void;
  className?: string;
}

export function DeliverableCard({ deliverable, onView, onDownload, className }: DeliverableCardProps) {
  const typeIcons = {
    document: FileText,
    checklist: CheckCircle,
    policy: AlertTriangle,
    next_steps: Clock
  };

  const TypeIcon = typeIcons[deliverable.type];

  return (
    <Card className={cn("border-green-200 bg-green-50/30", className)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
            <TypeIcon className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-green-900">{deliverable.title}</h3>
            <p className="text-sm text-green-700 mt-1">{deliverable.description}</p>
            <div className="flex items-center gap-2 mt-2 text-xs text-green-600">
              <Avatar className="h-4 w-4">
                <AvatarImage src={deliverable.consultant.avatar} />
                <AvatarFallback className="text-xs">
                  {deliverable.consultant.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <span>{deliverable.consultant.name}</span>
              <span>•</span>
              <span>{new Date(deliverable.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {deliverable.attachments && deliverable.attachments.length > 0 && (
          <div className="mt-3 pt-3 border-t border-green-200">
            <div className="text-xs text-green-600 mb-2">
              {deliverable.attachments.length} attachment(s)
            </div>
            <div className="space-y-1">
              {deliverable.attachments.map((attachment, index) => (
                <div key={index} className="text-xs text-green-700">
                  {attachment.name} ({(attachment.size / 1024).toFixed(1)} KB)
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          {onView && (
            <Button size="sm" variant="outline" onClick={onView} className="flex-1 h-9">
              View Details
            </Button>
          )}
          {onDownload && deliverable.attachments && deliverable.attachments.length > 0 && (
            <Button size="sm" onClick={onDownload} className="h-9">
              <FileText className="h-3 w-3 mr-1" />
              Download
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
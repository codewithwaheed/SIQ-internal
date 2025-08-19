import { useState, useEffect } from 'react';
import { DashboardLayout } from './DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  MessageSquareMore, 
  Clock, 
  Users, 
  CheckCircle, 
  AlertTriangle,
  FileText,
  Calendar,
  Eye,
  MessageCircle,
  FileDown,
  StickyNote,
  Send,
  UserCheck,
  HeadphonesIcon,
  Shield
} from 'lucide-react';

interface Escalation {
  id: string;
  created_at: string;
  updated_at: string;
  status: string;
  priority: string;
  reason: string | null;
  session_id: string | null;
  message_log: any[] | null;
  user_id: string;
  assigned_consultant: string | null;
  resolved_at: string | null;
  profile?: {
    first_name: string | null;
    last_name: string | null;
    company_name: string | null;
    email: string;
  };
}

interface EscalationStats {
  newThisWeek: number;
  resolved: number;
  pending: number;
  followUp: number;
}

export const ConsultantDashboard = () => {
  const { user } = useAuth();
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [stats, setStats] = useState<EscalationStats>({
    newThisWeek: 0,
    resolved: 0,
    pending: 0,
    followUp: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedEscalation, setSelectedEscalation] = useState<Escalation | null>(null);
  const [internalNote, setInternalNote] = useState('');
  const [responseMessage, setResponseMessage] = useState('');

  useEffect(() => {
    if (user) {
      fetchEscalations();
    }
  }, [user]);

  const fetchEscalations = async () => {
    try {
      // Get escalations with profile data using a manual join
      const { data: escalationsData, error } = await supabase
        .from('escalations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get profile data for each escalation
      const escalationsWithProfiles = await Promise.all(
        (escalationsData || []).map(async (escalation) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('first_name, last_name, company_name, email')
            .eq('user_id', escalation.user_id)
            .single();

          return {
            ...escalation,
            message_log: Array.isArray(escalation.message_log) ? escalation.message_log : [],
            profile: profileData || null
          };
        })
      );

      setEscalations(escalationsWithProfiles);

      // Calculate stats
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const newThisWeek = escalationsWithProfiles.filter(e => 
        new Date(e.created_at) >= weekAgo
      ).length;

      const resolved = escalationsWithProfiles.filter(e => 
        e.status === 'resolved'
      ).length;

      const pending = escalationsWithProfiles.filter(e => 
        e.status === 'pending'
      ).length;

      const followUp = escalationsWithProfiles.filter(e => 
        e.status === 'in_progress'
      ).length;

      setStats({ newThisWeek, resolved, pending, followUp });
    } catch (error: any) {
      toast.error('Failed to load escalations');
      console.error('Error fetching escalations:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateEscalationStatus = async (escalationId: string, status: string) => {
    try {
      const updateData: any = { 
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('escalations')
        .update(updateData)
        .eq('id', escalationId);

      if (error) throw error;

      toast.success(`Escalation marked as ${status}`);
      fetchEscalations();
      setSelectedEscalation(null);
    } catch (error: any) {
      toast.error('Failed to update escalation');
      console.error('Error updating escalation:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-destructive';
      case 'high': return 'bg-warning';
      case 'medium': return 'bg-accent';
      default: return 'bg-muted';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'high': return <Clock className="h-4 w-4 text-warning" />;
      default: return <FileText className="h-4 w-4 text-accent" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  if (loading) {
    return (
      <DashboardLayout title="Consultant Dashboard" subtitle="Loading escalations...">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Consultant Dashboard" 
      subtitle="Manage client escalations and provide expert guidance"
    >
      {/* Consultant Access Badge */}
      <div className="mb-6">
        <Badge className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
          <HeadphonesIcon className="mr-2 h-4 w-4" />
          Consultant Access
        </Badge>
      </div>

      {/* Summary Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">📨 New This Week</CardTitle>
            <MessageSquareMore className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.newThisWeek}</div>
            <p className="text-xs text-muted-foreground">Escalations submitted</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">✅ Resolved Tickets</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.resolved}</div>
            <p className="text-xs text-muted-foreground">Successfully closed</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">⏳ Pending Responses</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting action</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-accent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">🔁 Follow-Up Needed</CardTitle>
            <UserCheck className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{stats.followUp}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>
      </div>

      {/* Escalation Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            📥 Escalation Queue
            <Badge variant="outline" className="ml-2">{escalations.length} total</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {escalations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p>No escalations found. All clear! 🎉</p>
              </div>
            ) : (
              escalations.map((escalation) => (
                <div key={escalation.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-4 flex-1">
                    {getPriorityIcon(escalation.priority)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge className={getPriorityColor(escalation.priority)}>
                          {escalation.priority}
                        </Badge>
                        <Badge variant="outline">
                          {escalation.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium">
                        {escalation.reason || 'General Support Request'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {escalation.profile?.company_name && `${escalation.profile.company_name} • `}
                        {escalation.profile?.first_name} {escalation.profile?.last_name} • {formatTime(escalation.created_at)}
                      </p>
                    </div>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.open(`/dashboard/client/${escalation.user_id}`, '_blank')}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Client
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setSelectedEscalation(escalation)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Open Details
                          </Button>
                        </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2">
                          <span>Escalation Details</span>
                          <Badge className={getPriorityColor(escalation.priority)}>
                            {escalation.priority}
                          </Badge>
                        </DialogTitle>
                      </DialogHeader>
                      
                      <Tabs defaultValue="details" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                          <TabsTrigger value="details">Details</TabsTrigger>
                          <TabsTrigger value="chat">Chat Context</TabsTrigger>
                          <TabsTrigger value="notes">Notes</TabsTrigger>
                          <TabsTrigger value="actions">Actions</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="details" className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-medium mb-2">Client Information</h4>
                              <div className="space-y-1 text-sm">
                                <p><strong>Name:</strong> {escalation.profile?.first_name} {escalation.profile?.last_name}</p>
                                <p><strong>Company:</strong> {escalation.profile?.company_name || 'Not provided'}</p>
                                <p><strong>Email:</strong> {escalation.profile?.email}</p>
                              </div>
                            </div>
                            <div>
                              <h4 className="font-medium mb-2">Escalation Info</h4>
                              <div className="space-y-1 text-sm">
                                <p><strong>Priority:</strong> {escalation.priority}</p>
                                <p><strong>Status:</strong> {escalation.status}</p>
                                <p><strong>Created:</strong> {new Date(escalation.created_at).toLocaleDateString()}</p>
                                <p><strong>Reason:</strong> {escalation.reason || 'Not specified'}</p>
                              </div>
                            </div>
                          </div>
                        </TabsContent>
                        
                         <TabsContent value="chat" className="space-y-4">
                          <div className="bg-muted p-4 rounded-lg">
                            <h4 className="font-medium mb-2 flex items-center">
                              <MessageCircle className="mr-2 h-4 w-4" />
                              Chat Messages
                            </h4>
                            <div className="max-h-64 overflow-y-auto space-y-2">
                              {escalation.message_log && escalation.message_log.length > 0 ? (
                                escalation.message_log.map((message: any, index: number) => (
                                  <div key={index} className={`p-2 rounded ${message.role === 'user' ? 'bg-primary/10' : 'bg-muted'}`}>
                                    <div className="text-xs text-muted-foreground mb-1">
                                      {message.role === 'user' ? 'User' : 'Assistant'}
                                    </div>
                                    <div className="text-sm">{message.content}</div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-muted-foreground">No message log available</p>
                              )}
                            </div>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="notes" className="space-y-4">
                          <div>
                            <h4 className="font-medium mb-2 flex items-center">
                              <StickyNote className="mr-2 h-4 w-4" />
                              Internal Notes
                            </h4>
                            <Textarea
                              placeholder="Add internal notes about this escalation..."
                              value={internalNote}
                              onChange={(e) => setInternalNote(e.target.value)}
                              rows={4}
                            />
                            <Button className="mt-2" size="sm">
                              Save Notes
                            </Button>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="actions" className="space-y-4">
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium mb-2">Response</h4>
                              <Textarea
                                placeholder="Type your response to the client..."
                                value={responseMessage}
                                onChange={(e) => setResponseMessage(e.target.value)}
                                rows={4}
                              />
                              <Button className="mt-2">
                                <Send className="mr-2 h-4 w-4" />
                                Send Response
                              </Button>
                            </div>
                            
                            <div>
                              <h4 className="font-medium mb-2">Update Status</h4>
                              <div className="flex space-x-2">
                                <Button 
                                  variant="outline" 
                                  onClick={() => updateEscalationStatus(escalation.id, 'in_progress')}
                                >
                                  Mark In Progress
                                </Button>
                                <Button 
                                  variant="default"
                                  onClick={() => updateEscalationStatus(escalation.id, 'resolved')}
                                >
                                  Mark Resolved
                                </Button>
                              </div>
                            </div>
                            
                            <div>
                              <Button variant="outline" className="w-full">
                                <Calendar className="mr-2 h-4 w-4" />
                                Schedule Follow-up Call
                              </Button>
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </DialogContent>
                  </Dialog>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};
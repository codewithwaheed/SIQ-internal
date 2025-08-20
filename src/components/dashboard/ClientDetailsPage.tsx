import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from './DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  MessageSquare,
  FileText,
  AlertTriangle,
  Download,
  Eye,
  Calendar,
  User,
  Clock,
  TrendingUp,
} from 'lucide-react';

interface ClientProfile {
  id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  phone: string | null;
  country: string | null;
  created_at: string;
}

interface Escalation {
  id: string;
  created_at: string;
  status: string;
  priority: string;
  reason: string | null;
  resolved_at: string | null;
  assigned_to: string | null;
}

interface ChatConversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface Document {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
  file_path: string;
}

export const ClientDetailsPage = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignedConsultant, setAssignedConsultant] = useState('');

  useEffect(() => {
    if (clientId) {
      fetchClientDetails();
    }
  }, [clientId]);

  const fetchClientDetails = async () => {
    try {
      setLoading(true);

      // Fetch client profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', clientId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      setClient(profileData);

      // Fetch escalations
      const { data: escalationData, error: escalationError } = await supabase
        .from('escalations')
        .select('*')
        .eq('user_id', clientId)
        .order('created_at', { ascending: false });

      if (escalationError) throw escalationError;
      setEscalations(escalationData || []);

      // Fetch chat conversations
      const { data: conversationData, error: conversationError } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('user_id', clientId)
        .order('updated_at', { ascending: false });

      if (conversationError) throw conversationError;
      setConversations(conversationData || []);

      // Fetch documents
      const { data: documentData, error: documentError } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', clientId)
        .order('uploaded_at', { ascending: false });

      if (documentError) throw documentError;
      setDocuments(documentData || []);
    } catch (error: any) {
      toast.error('Failed to load client details');
      console.error('Error fetching client details:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAssignedConsultant = async (escalationId: string, consultantId: string) => {
    try {
      const { error } = await supabase
        .from('escalations')
        .update({ assigned_to: consultantId })
        .eq('id', escalationId);

      if (error) throw error;

      toast.success('Consultant assigned successfully');
      fetchClientDetails();
    } catch (error: any) {
      toast.error('Failed to assign consultant');
      console.error('Error assigning consultant:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-destructive';
      case 'high':
        return 'bg-warning';
      case 'medium':
        return 'bg-accent';
      default:
        return 'bg-muted';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'bg-success';
      case 'in_progress':
        return 'bg-warning';
      case 'pending':
        return 'bg-destructive';
      default:
        return 'bg-muted';
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Client Details" subtitle="Loading client information...">
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!client) {
    return (
      <DashboardLayout title="Client Details" subtitle="Client not found">
        <div className="py-8 text-center">
          <p className="mb-4 text-muted-foreground">Client not found</p>
          <Button onClick={() => navigate('/dashboard/chat')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <div className="page">
      <div className="page-title">
        <h1 className="text-3xl font-bold text-foreground">{`${client.first_name} ${client.last_name}`}</h1>
        <p className="text-muted-foreground">{client.company_name || 'Client Details'}</p>
      </div>

      <div className="section-card">
        <Button variant="outline" onClick={() => navigate('/dashboard/chat')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>

      {/* Client Overview Cards */}
      <div className="grid-2 lg:grid-cols-3">
        <div className="section-card">
          <div className="flex items-center gap-space-2">
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-2xl font-bold">{escalations.length}</div>
              <p className="text-sm font-medium">Total Escalations</p>
              <p className="text-xs text-muted-foreground">
                {escalations.filter((e) => e.status === 'resolved').length} resolved
              </p>
            </div>
          </div>
        </div>

        <div className="section-card">
          <div className="flex items-center gap-space-2">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-2xl font-bold">{conversations.length}</div>
              <p className="text-sm font-medium">Chat Sessions</p>
              <p className="text-xs text-muted-foreground">
                Last activity:{' '}
                {conversations[0]
                  ? new Date(conversations[0].updated_at).toLocaleDateString()
                  : 'None'}
              </p>
            </div>
          </div>
        </div>

        <div className="section-card">
          <div className="flex items-center gap-space-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-2xl font-bold">{documents.length}</div>
              <p className="text-sm font-medium">Documents</p>
              <p className="text-xs text-muted-foreground">
                Total size: {formatFileSize(documents.reduce((sum, doc) => sum + doc.file_size, 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Client Information */}
      <div className="section-card">
        <h2 className="flex items-center gap-space-2 text-xl font-semibold">
          <Building2 className="h-5 w-5" />
          Client Information
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Name:</span>
              <span>
                {client.first_name} {client.last_name}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Email:</span>
              <span>{client.email}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Company:</span>
              <span>{client.company_name || 'Not provided'}</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Phone:</span>
              <span>{client.phone || 'Not provided'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Country:</span>
              <span>{client.country || 'Not provided'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Client since:</span>
              <span>{new Date(client.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="escalations" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="escalations">Escalations</TabsTrigger>
          <TabsTrigger value="chats">Chat History</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="escalations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Escalation History</CardTitle>
            </CardHeader>
            <CardContent>
              {escalations.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">No escalations found</p>
              ) : (
                <div className="space-y-4">
                  {escalations.map((escalation) => (
                    <div
                      key={escalation.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex-1">
                        <div className="mb-2 flex items-center space-x-2">
                          <Badge className={getPriorityColor(escalation.priority)}>
                            {escalation.priority}
                          </Badge>
                          <Badge className={getStatusColor(escalation.status)}>
                            {escalation.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="font-medium">
                          {escalation.reason || 'General Support Request'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Created: {new Date(escalation.created_at).toLocaleDateString()}
                          {escalation.resolved_at && (
                            <>
                              {' '}
                              • Resolved: {new Date(escalation.resolved_at).toLocaleDateString()}
                            </>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Select
                          value={escalation.assigned_to || 'unassigned'}
                          onValueChange={(value) =>
                            updateAssignedConsultant(
                              escalation.id,
                              value === 'unassigned' ? null : value,
                            )
                          }
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Assign Consultant" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            <SelectItem value="consultant-1">John Doe</SelectItem>
                            <SelectItem value="consultant-2">Jane Smith</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Chat History</CardTitle>
            </CardHeader>
            <CardContent>
              {conversations.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">No chat sessions found</p>
              ) : (
                <div className="space-y-4">
                  {conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div>
                        <p className="font-medium">{conversation.title}</p>
                        <p className="text-sm text-muted-foreground">
                          Created: {new Date(conversation.created_at).toLocaleDateString()} • Last
                          updated: {new Date(conversation.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Uploaded Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">No documents found</p>
              ) : (
                <div className="space-y-4">
                  {documents.map((document) => (
                    <div
                      key={document.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-accent" />
                        <div>
                          <p className="font-medium">{document.file_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {document.file_type.toUpperCase()} •{' '}
                            {formatFileSize(document.file_size)} • Uploaded:{' '}
                            {new Date(document.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Combine all activities and sort by date */}
                {[
                  ...escalations.map((e) => ({
                    type: 'escalation',
                    date: e.created_at,
                    data: e,
                  })),
                  ...conversations.map((c) => ({
                    type: 'chat',
                    date: c.updated_at,
                    data: c,
                  })),
                  ...documents.map((d) => ({
                    type: 'document',
                    date: d.uploaded_at,
                    data: d,
                  })),
                ]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 10)
                  .map((activity, index) => (
                    <div key={index} className="flex items-center space-x-3 rounded-lg border p-3">
                      <div className="flex-shrink-0">
                        {activity.type === 'escalation' && (
                          <AlertTriangle className="h-4 w-4 text-warning" />
                        )}
                        {activity.type === 'chat' && (
                          <MessageSquare className="h-4 w-4 text-primary" />
                        )}
                        {activity.type === 'document' && (
                          <FileText className="h-4 w-4 text-accent" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">
                          {activity.type === 'escalation' &&
                            `New escalation: ${(activity.data as Escalation).reason || 'General Support'}`}
                          {activity.type === 'chat' &&
                            `Chat session: ${(activity.data as ChatConversation).title}`}
                          {activity.type === 'document' &&
                            `Document uploaded: ${(activity.data as Document).file_name}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.date).toLocaleDateString()} at{' '}
                          {new Date(activity.date).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

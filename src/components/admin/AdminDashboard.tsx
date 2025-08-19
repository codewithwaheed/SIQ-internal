import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// DatePicker component not needed for this implementation
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Clock, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Download,
  Calendar,
  Target,
  Star,
  FileText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ConsultantApplicationsDashboard } from './ConsultantApplicationsDashboard';
import { AIEvaluationDashboard } from './AIEvaluationDashboard';
import { MasterKnowledgeManager } from './MasterKnowledgeManager';
import { RealTimeAnalyticsDashboard } from './RealTimeAnalyticsDashboard';
import { SystemHealthDashboard } from './SystemHealthDashboard';
import { SecurityMonitoringDashboard } from './SecurityMonitoringDashboard';
import { RecentActivityFeed } from './RecentActivityFeed';
import { ConsultantInviteModal } from './ConsultantInviteModal';
import { LatestCVEsDashboard } from './LatestCVEsDashboard';
import { MessageFeedbackDashboard } from './MessageFeedbackDashboard';

interface DashboardMetrics {
  totalEscalations: number;
  avgFirstResponseTime: number;
  avgResolutionTime: number;
  conversionRate: number;
  reopenRate: number;
  satisfactionScore: number;
  activeConsultants: number;
  overdueEscalations: number;
}

interface EscalationData {
  id: string;
  status: string;
  priority: string;
  created_at: string;
  sla_deadline: string;
  consultant_name?: string;
  user_email: string;
  framework_tags: string[];
}

export const AdminDashboard = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [escalations, setEscalations] = useState<EscalationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [selectedFramework, setSelectedFramework] = useState<string>('all');
  const [activeView, setActiveView] = useState<'overview' | 'applications'>('overview');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [dateRange, selectedFramework]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchMetrics(),
        fetchEscalations(),
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    const { data: escalationData, error: escalationError } = await supabase
      .from('escalations')
      .select(`
        *,
        escalation_metrics (
          first_response_time,
          resolution_time,
          user_satisfaction_rating,
          reopened_count
        )
      `)
      .gte('created_at', dateRange.from.toISOString())
      .lte('created_at', dateRange.to.toISOString());

    if (escalationError) throw escalationError;

    const { data: consultantData, error: consultantError } = await supabase
      .from('profiles')
      .select('*')
      .contains('expertise_areas', selectedFramework === 'all' ? [] : [selectedFramework])
      .eq('availability_status', 'online');

    if (consultantError) throw consultantError;

    // Calculate metrics
    const totalEscalations = escalationData?.length || 0;
    const metricsData = escalationData?.map(e => e.escalation_metrics).filter(Boolean) || [];
    
    const avgFirstResponseTime = metricsData.reduce((acc, m) => {
      if (!m?.first_response_time) return acc;
      const timeStr = typeof m.first_response_time === 'string' ? m.first_response_time : String(m.first_response_time);
      const hours = parseFloat(timeStr.replace(/[^\d.]/g, '')) || 0;
      return acc + hours;
    }, 0) / (metricsData.length || 1);

    const avgResolutionTime = metricsData.reduce((acc, m) => {
      if (!m?.resolution_time) return acc;
      const timeStr = typeof m.resolution_time === 'string' ? m.resolution_time : String(m.resolution_time);
      const hours = parseFloat(timeStr.replace(/[^\d.]/g, '')) || 0;
      return acc + hours;
    }, 0) / (metricsData.length || 1);

    const satisfactionScores = metricsData.filter(m => m?.user_satisfaction_rating);
    const satisfactionScore = satisfactionScores.reduce((acc, m) => acc + (m?.user_satisfaction_rating || 0), 0) / (satisfactionScores.length || 1);

    const reopenedCount = metricsData.reduce((acc, m) => acc + (m?.reopened_count || 0), 0);
    const reopenRate = totalEscalations > 0 ? (reopenedCount / totalEscalations) * 100 : 0;

    const resolvedEscalations = escalationData?.filter(e => e.status === 'resolved' || e.status === 'closed').length || 0;
    const conversionRate = totalEscalations > 0 ? (resolvedEscalations / totalEscalations) * 100 : 0;

    const overdueEscalations = escalationData?.filter(e => 
      e.sla_deadline && new Date(e.sla_deadline) < new Date() && e.status !== 'resolved' && e.status !== 'closed'
    ).length || 0;

    setMetrics({
      totalEscalations,
      avgFirstResponseTime,
      avgResolutionTime,
      conversionRate,
      reopenRate,
      satisfactionScore,
      activeConsultants: consultantData?.length || 0,
      overdueEscalations
    });
  };

  const fetchEscalations = async () => {
    const { data, error } = await supabase
      .from('escalations')
      .select(`
        id,
        status,
        priority,
        created_at,
        sla_deadline,
        framework_tags,
        user_id
      `)
      .gte('created_at', dateRange.from.toISOString())
      .lte('created_at', dateRange.to.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get user profiles separately
    const userIds = data?.map(e => e.user_id).filter(Boolean) || [];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, email, first_name, last_name')
      .in('user_id', userIds);

    const formattedData = data?.map(escalation => {
      const userProfile = profiles?.find(p => p.user_id === escalation.user_id);
      return {
        id: escalation.id,
        status: escalation.status,
        priority: escalation.priority,
        created_at: escalation.created_at,
        sla_deadline: escalation.sla_deadline,
        framework_tags: escalation.framework_tags || [],
        user_email: userProfile?.email || 'Unknown',
        consultant_name: undefined // Will be populated when we have consultant assignment
      };
    }) || [];

    setEscalations(formattedData);
  };

  const exportToCSV = () => {
    const csvData = escalations.map(e => ({
      ID: e.id,
      Status: e.status,
      Priority: e.priority,
      'Created At': format(new Date(e.created_at), 'yyyy-MM-dd HH:mm'),
      'SLA Deadline': e.sla_deadline ? format(new Date(e.sla_deadline), 'yyyy-MM-dd HH:mm') : '',
      'User Email': e.user_email,
      'Consultant': e.consultant_name || 'Unassigned',
      'Frameworks': e.framework_tags.join(', ')
    }));

    const csv = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `escalations-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
      case 'closed':
        return 'default';
      case 'in_progress':
        return 'secondary';
      case 'pending':
        return 'outline';
      default:
        return 'destructive';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'secondary';
      case 'normal':
        return 'default';
      case 'low':
        return 'outline';
      default:
        return 'default';
    }
  };

  if (activeView === 'applications') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setActiveView('overview')}>
            ← Back to Overview
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Consultant Applications</h1>
            <p className="text-muted-foreground">Review and manage consultant applications</p>
          </div>
        </div>
        <ConsultantApplicationsDashboard />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">Monitor escalation performance and team metrics</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={selectedFramework} onValueChange={setSelectedFramework}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Frameworks</SelectItem>
              <SelectItem value="iso27001">ISO 27001</SelectItem>
              <SelectItem value="nist">NIST</SelectItem>
              <SelectItem value="gdpr">GDPR</SelectItem>
              <SelectItem value="sox">SOX</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          
          <Button onClick={() => setShowInviteModal(true)}>
            <Users className="h-4 w-4 mr-2" />
            Invite Consultant
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Escalations</p>
                <p className="text-2xl font-bold">{metrics?.totalEscalations || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Response Time</p>
                <p className="text-2xl font-bold">{metrics?.avgFirstResponseTime.toFixed(1) || 0}h</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Resolution Rate</p>
                <p className="text-2xl font-bold">{metrics?.conversionRate.toFixed(1) || 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold">{metrics?.overdueEscalations || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="security">Security Monitoring</TabsTrigger>
          <TabsTrigger value="knowledge">Master Knowledge</TabsTrigger>
          <TabsTrigger value="evaluation">AI Evaluation</TabsTrigger>
          <TabsTrigger value="queue">Escalation Queue</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="health">System Health</TabsTrigger>
          <TabsTrigger value="activity">Activity Feed</TabsTrigger>
          <TabsTrigger value="applications" onClick={() => setActiveView('applications')}>Applications</TabsTrigger>
          <TabsTrigger value="cve-monitoring">CVE Monitoring</TabsTrigger>
          <TabsTrigger value="ai-feedback">AI Feedback</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Average Resolution Time</span>
                    <span>{metrics?.avgResolutionTime.toFixed(1) || 0} hours</span>
                  </div>
                  <Progress value={Math.min((metrics?.avgResolutionTime || 0) / 48 * 100, 100)} />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Customer Satisfaction</span>
                    <span>{metrics?.satisfactionScore.toFixed(1) || 0}/5</span>
                  </div>
                  <Progress value={(metrics?.satisfactionScore || 0) / 5 * 100} />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Reopen Rate</span>
                    <span>{metrics?.reopenRate.toFixed(1) || 0}%</span>
                  </div>
                  <Progress value={metrics?.reopenRate || 0} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Team Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Users className="h-8 w-8 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{metrics?.activeConsultants || 0}</p>
                    <p className="text-sm text-muted-foreground">Active Consultants</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="queue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Escalation Queue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {escalations.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No escalations found</p>
                ) : (
                  escalations.map((escalation) => (
                    <div key={escalation.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">#{escalation.id.slice(0, 8)}</span>
                          <Badge variant={getStatusColor(escalation.status)}>
                            {escalation.status}
                          </Badge>
                          <Badge variant={getPriorityColor(escalation.priority)}>
                            {escalation.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{escalation.user_email}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(escalation.created_at), 'MMM d, yyyy h:mm a')}
                          {escalation.sla_deadline && (
                            <>
                              <span>•</span>
                              <span>SLA: {format(new Date(escalation.sla_deadline), 'MMM d, h:mm a')}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {escalation.consultant_name || 'Unassigned'}
                        </p>
                        <div className="flex gap-1 mt-1">
                          {escalation.framework_tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <RealTimeAnalyticsDashboard />
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <SecurityMonitoringDashboard />
        </TabsContent>

        <TabsContent value="health" className="space-y-6">
          <SystemHealthDashboard />
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <RecentActivityFeed />
        </TabsContent>

        <TabsContent value="knowledge">
          <MasterKnowledgeManager />
        </TabsContent>

        <TabsContent value="evaluation">
          <AIEvaluationDashboard />
        </TabsContent>

        <TabsContent value="cve-monitoring" className="space-y-6">
          <LatestCVEsDashboard />
        </TabsContent>

        <TabsContent value="ai-feedback" className="space-y-6">
          <MessageFeedbackDashboard />
        </TabsContent>
      </Tabs>

      <ConsultantInviteModal 
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSuccess={() => fetchData()}
      />
    </div>
  );
};
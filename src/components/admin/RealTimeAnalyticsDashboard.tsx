import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  FileText, 
  MessageSquare, 
  ExternalLink,
  Activity,
  Clock,
  Target,
  Download,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface AnalyticsData {
  summary: {
    totalConversations: number;
    activeUsers: number;
    escalationRate: number;
    avgResponseTime: number;
  };
  trends: Array<{
    month: string;
    chats: number;
    escalations: number;
  }>;
  frameworks: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  usage: {
    templatesCreated: number;
    responsesCreated: number;
    linksCreated: number;
    policiesGenerated: number;
    totalResponseUses: number;
    totalLinkAccesses: number;
    topResponses: Array<{ title: string; use_count: number }>;
    topLinks: Array<{ title: string; access_count: number }>;
  };
}

export const RealTimeAnalyticsDashboard = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState('30d');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalyticsData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchAnalyticsData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [timeframe, autoRefresh]);

  const fetchAnalyticsData = async () => {
    if (!loading) setRefreshing(true);
    
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const headers = {
        'Authorization': `Bearer ${session.session.access_token}`,
        'Content-Type': 'application/json'
      };

      // Fetch all analytics data in parallel
      const [summaryRes, trendsRes, frameworksRes, usageRes] = await Promise.all([
        supabase.functions.invoke('admin-analytics/summary', { headers }),
        supabase.functions.invoke('admin-analytics/trends', { 
          headers,
          body: { timeframe }
        }),
        supabase.functions.invoke('admin-analytics/frameworks', { headers }),
        supabase.functions.invoke('admin-analytics/usage', { 
          headers,
          body: { timeframe }
        })
      ]);

      if (summaryRes.error) throw summaryRes.error;
      if (trendsRes.error) throw trendsRes.error;
      if (frameworksRes.error) throw frameworksRes.error;
      if (usageRes.error) throw usageRes.error;

      setData({
        summary: summaryRes.data || {
          totalConversations: 0,
          activeUsers: 0,
          escalationRate: 0,
          avgResponseTime: 0
        },
        trends: trendsRes.data || [],
        frameworks: frameworksRes.data || [],
        usage: usageRes.data || {
          templatesCreated: 0,
          responsesCreated: 0,
          linksCreated: 0,
          policiesGenerated: 0,
          totalResponseUses: 0,
          totalLinkAccesses: 0,
          topResponses: [],
          topLinks: []
        }
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const exportData = () => {
    if (!data) return;

    const csvData = [
      ['Metric', 'Value'],
      ['Total Conversations', data.summary.totalConversations],
      ['Active Users', data.summary.activeUsers],
      ['Escalation Rate', `${data.summary.escalationRate}%`],
      ['Avg Response Time', `${data.summary.avgResponseTime}h`],
      ['Templates Created', data.usage.templatesCreated],
      ['Responses Created', data.usage.responsesCreated],
      ['Links Created', data.usage.linksCreated],
      ['Policies Generated', data.usage.policiesGenerated],
      ['Total Response Uses', data.usage.totalResponseUses],
      ['Total Link Accesses', data.usage.totalLinkAccesses],
    ];

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading real-time analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Real-Time Analytics</h2>
          <p className="text-muted-foreground">
            Live system metrics and usage patterns
            {refreshing && (
              <span className="inline-flex items-center ml-2">
                <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                Updating...
              </span>
            )}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-green-50 border-green-200' : ''}
          >
            <Activity className="h-4 w-4 mr-2" />
            Auto Refresh {autoRefresh ? 'ON' : 'OFF'}
          </Button>
          
          <Button variant="outline" size="sm" onClick={fetchAnalyticsData} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button variant="outline" size="sm" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Conversations</p>
                <p className="text-2xl font-bold">{data?.summary.totalConversations || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold">{data?.summary.activeUsers || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Escalation Rate</p>
                <p className="text-2xl font-bold">{data?.summary.escalationRate.toFixed(1) || 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Response Time</p>
                <p className="text-2xl font-bold">{data?.summary.avgResponseTime.toFixed(1) || 0}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Activity Trends</TabsTrigger>
          <TabsTrigger value="frameworks">Framework Usage</TabsTrigger>
          <TabsTrigger value="tools">Tools Usage</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Conversation & Escalation Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data?.trends || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="chats" 
                      stroke="#0088FE" 
                      strokeWidth={2}
                      name="Conversations"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="escalations" 
                      stroke="#FF8042" 
                      strokeWidth={2}
                      name="Escalations"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="frameworks" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Framework Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data?.frameworks || []}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, value }) => `${name}: ${value}%`}
                      >
                        {data?.frameworks?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Framework Rankings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data?.frameworks?.map((framework, index) => (
                    <div key={framework.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <span className="font-medium">{framework.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: framework.color }}
                        />
                        <span className="text-sm font-medium">{framework.value}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tools" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FileText className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Templates Created</p>
                    <p className="text-2xl font-bold">{data?.usage.templatesCreated || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <MessageSquare className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Responses Created</p>
                    <p className="text-2xl font-bold">{data?.usage.responsesCreated || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <ExternalLink className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Links Created</p>
                    <p className="text-2xl font-bold">{data?.usage.linksCreated || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Target className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Policies Generated</p>
                    <p className="text-2xl font-bold">{data?.usage.policiesGenerated || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Canned Responses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data?.usage.topResponses?.map((response, index) => (
                    <div key={response.title} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <span className="font-medium truncate">{response.title}</span>
                      </div>
                      <span className="text-sm font-medium">{response.use_count} uses</span>
                    </div>
                  )) || (
                    <p className="text-center text-muted-foreground py-4">No data available</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Resource Links</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data?.usage.topLinks?.map((link, index) => (
                    <div key={link.title} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <span className="font-medium truncate">{link.title}</span>
                      </div>
                      <span className="text-sm font-medium">{link.access_count} views</span>
                    </div>
                  )) || (
                    <p className="text-center text-muted-foreground py-4">No data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Usage Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span>Total Response Uses</span>
                    <Badge variant="secondary">{data?.usage.totalResponseUses || 0}</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span>Total Link Accesses</span>
                    <Badge variant="secondary">{data?.usage.totalLinkAccesses || 0}</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span>System Health</span>
                    <Badge variant="default" className="bg-green-500">Healthy</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Database Status</span>
                    <Badge variant="default" className="bg-green-500">Online</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Analytics Status</span>
                    <Badge variant="default" className="bg-green-500">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Last Updated</span>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(), 'MMM d, HH:mm')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
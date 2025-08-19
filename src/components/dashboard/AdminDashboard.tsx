import { DashboardLayout } from './DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import {
  Users,
  CreditCard,
  MessageSquareMore,
  TrendingUp,
  AlertTriangle,
  UserPlus,
  DollarSign,
  Activity,
  BarChart3,
  Building2,
  Clock,
  ExternalLink,
} from 'lucide-react';

interface TenantData {
  id: string;
  email: string;
  company_name: string;
  subscription_tier: string;
  subscribed: boolean;
  created_at: string;
  total_documents: number;
  monthly_uploads_used: number;
  monthly_escalations_used: number;
}

interface ActivityEntry {
  id: string;
  timestamp: string;
  user_email: string;
  company_name: string;
  action: string;
  details: string;
}

interface EscalationData {
  id: string;
  created_at: string;
  status: string;
  priority: string;
  escalation_type: string;
  reason: string;
  user_email: string;
  company_name: string;
  consultant_email?: string;
  consultant_name?: string;
  resolution_notes?: string;
  resolved_at?: string;
}

export const AdminDashboard = () => {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<TenantData[]>([]);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [escalations, setEscalations] = useState<EscalationData[]>([]);
  const [escalationStats, setEscalationStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) {
        throw new Error('No authentication token');
      }

      const headers = {
        Authorization: `Bearer ${session.data.session.access_token}`,
        'Content-Type': 'application/json',
      };

      // Fetch all admin data in parallel
      const [tenantsRes, activitiesRes, escalationsRes] = await Promise.all([
        supabase.functions.invoke('admin-tenants', { headers }),
        supabase.functions.invoke('admin-activity', { headers }),
        supabase.functions.invoke('admin-escalations', { headers }),
      ]);

      if (tenantsRes.error) throw new Error(tenantsRes.error.message);
      if (activitiesRes.error) throw new Error(activitiesRes.error.message);
      if (escalationsRes.error) throw new Error(escalationsRes.error.message);

      setTenants(tenantsRes.data?.tenants || []);
      setActivities(activitiesRes.data?.activities || []);
      setEscalations(escalationsRes.data?.escalations || []);
      setEscalationStats(escalationsRes.data?.stats || {});
    } catch (err) {
      console.error('Error fetching admin data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch admin data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-warning';
      case 'active':
        return 'bg-primary';
      case 'resolved':
        return 'bg-success';
      default:
        return 'bg-muted';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-destructive';
      case 'normal':
        return 'bg-primary';
      case 'low':
        return 'bg-muted';
      default:
        return 'bg-muted';
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Admin Dashboard" subtitle="Platform overview and user management">
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Admin Dashboard" subtitle="Platform overview and user management">
        <div className="p-8 text-center text-destructive">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12" />
          <p>Error loading admin data: {error}</p>
          <Button onClick={fetchAdminData} className="mt-4">
            Retry
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const subscribedTenants = tenants.filter((t) => t.subscribed);
  const totalRevenue = subscribedTenants.reduce((sum, tenant) => {
    const tierValues = { Basic: 0, Pro: 99, Premium: 299 };
    return sum + (tierValues[tenant.subscription_tier as keyof typeof tierValues] || 0);
  }, 0);
  return (
    <DashboardLayout title="Admin Dashboard" subtitle="Platform overview and user management">
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Stats Cards */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenants.length}</div>
            <p className="text-xs text-muted-foreground">Companies registered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{subscribedTenants.length}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((subscribedTenants.length / tenants.length) * 100)}% of tenants
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">From active subscriptions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Escalations</CardTitle>
            <MessageSquareMore className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {escalationStats.pending + escalationStats.active}
            </div>
            <p className="text-xs text-muted-foreground">
              {escalationStats.pending} pending, {escalationStats.active} active
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Tenant Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Tenant Management
              <Button size="sm" disabled>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Tenant
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="max-h-80 overflow-y-auto">
                <div className="space-y-2">
                  {tenants.slice(0, 5).map((tenant) => (
                    <div
                      key={tenant.id}
                      className="flex items-center justify-between rounded border border-border p-3"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">{tenant.company_name}</p>
                        <p className="text-xs text-muted-foreground">{tenant.email}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge
                            variant={tenant.subscribed ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {tenant.subscription_tier}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {tenant.total_documents} docs
                          </span>
                        </div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        {formatDate(tenant.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {tenants.length > 5 && (
                <div className="text-center">
                  <Button variant="outline" size="sm">
                    View All {tenants.length} Tenants
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="mr-2 h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-80 space-y-3 overflow-y-auto">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start space-x-3 rounded p-2 hover:bg-muted/50"
                >
                  <div className="mt-2 h-2 w-2 rounded-full bg-primary"></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {activity.user_email} ({activity.company_name})
                    </p>
                    <p className="text-xs text-muted-foreground">{activity.details}</p>
                    <div className="mt-1 flex items-center text-xs text-muted-foreground">
                      <Clock className="mr-1 h-3 w-3" />
                      {formatDate(activity.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Escalation Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <MessageSquareMore className="mr-2 h-5 w-5" />
              Escalation Logs
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href="/dashboard/escalation-queue" className="flex items-center">
                <ExternalLink className="mr-2 h-4 w-4" />
                View Queue
              </a>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Stats Summary */}
            <div className="mb-4 grid grid-cols-4 gap-4">
              <div className="rounded bg-muted/50 p-3 text-center">
                <div className="text-lg font-semibold">{escalationStats.total || 0}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="rounded bg-warning/10 p-3 text-center">
                <div className="text-lg font-semibold text-warning">
                  {escalationStats.pending || 0}
                </div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
              <div className="rounded bg-primary/10 p-3 text-center">
                <div className="text-lg font-semibold text-primary">
                  {escalationStats.active || 0}
                </div>
                <div className="text-xs text-muted-foreground">Active</div>
              </div>
              <div className="rounded bg-success/10 p-3 text-center">
                <div className="text-lg font-semibold text-success">
                  {escalationStats.resolved || 0}
                </div>
                <div className="text-xs text-muted-foreground">Resolved</div>
              </div>
            </div>

            {/* Recent Escalations */}
            <div className="max-h-64 space-y-3 overflow-y-auto">
              {escalations.slice(0, 8).map((escalation) => (
                <div
                  key={escalation.id}
                  className="flex items-center justify-between rounded border border-border p-3 hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <Badge className={getStatusBadgeColor(escalation.status)} variant="default">
                        {escalation.status}
                      </Badge>
                      <Badge
                        className={getPriorityBadgeColor(escalation.priority)}
                        variant="outline"
                      >
                        {escalation.priority}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {escalation.escalation_type}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{escalation.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      {escalation.user_email} ({escalation.company_name})
                    </p>
                    {escalation.consultant_name && (
                      <p className="text-xs text-muted-foreground">
                        Assigned to: {escalation.consultant_name}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div className="flex items-center">
                      <Clock className="mr-1 h-3 w-3" />
                      {formatDate(escalation.created_at)}
                    </div>
                    {escalation.resolved_at && (
                      <div className="mt-1 text-success">
                        Resolved {formatDate(escalation.resolved_at)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

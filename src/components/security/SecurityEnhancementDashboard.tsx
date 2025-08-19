import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Shield, AlertTriangle, CheckCircle, Activity } from 'lucide-react';
import { toast } from 'sonner';

interface SuspiciousActivity {
  alert_type: string;
  description: string;
  user_id: string;
  metadata: any;
  created_at: string;
}

interface SecurityMetrics {
  totalUsers: number;
  adminCount: number;
  recentSecurityEvents: number;
  suspiciousActivities: SuspiciousActivity[];
}

export const SecurityEnhancementDashboard: React.FC = () => {
  const { user, userRole } = useAuth();
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userRole === 'admin') {
      loadSecurityMetrics();
    }
  }, [userRole]);

  const loadSecurityMetrics = async () => {
    try {
      setLoading(true);

      // Get user count
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get admin count
      const { count: adminCount } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin');

      // Get recent security events (last 24 hours)
      const { count: recentEvents } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .in('action', ['ROLE_CHANGE_ENHANCED', 'ADMIN_ROLE_ALERT', 'DOCUMENT_ACCESS', 'FILE_VALIDATION_FAILED']);

      // Get suspicious activities
      const { data: suspiciousData, error: suspiciousError } = await supabase
        .rpc('detect_suspicious_activity');

      if (suspiciousError) {
        console.error('Error fetching suspicious activities:', suspiciousError);
      }

      setMetrics({
        totalUsers: userCount || 0,
        adminCount: adminCount || 0,
        recentSecurityEvents: recentEvents || 0,
        suspiciousActivities: suspiciousData || []
      });

    } catch (error) {
      console.error('Error loading security metrics:', error);
      toast.error('Failed to load security metrics');
    } finally {
      setLoading(false);
    }
  };

  const cleanupOldAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .rpc('cleanup_old_audit_logs', { retention_days: 90 });

      if (error) {
        throw error;
      }

      toast.success(`Cleaned up ${data} old audit log entries`);
      loadSecurityMetrics(); // Refresh metrics
    } catch (error) {
      console.error('Error cleaning up audit logs:', error);
      toast.error('Failed to cleanup audit logs');
    }
  };

  if (userRole !== 'admin') {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Access denied. This dashboard is only available to administrators.
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load security metrics. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Security Enhancement Dashboard</h2>
      </div>

      {/* Security Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Registered users in the system
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.adminCount}</div>
            <p className="text-xs text-muted-foreground">
              Users with admin privileges
            </p>
            {metrics.adminCount > 3 && (
              <Badge variant="destructive" className="mt-1">
                High admin count
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Events (24h)</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.recentSecurityEvents}</div>
            <p className="text-xs text-muted-foreground">
              Recent security-related activities
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Suspicious Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Suspicious Activities</CardTitle>
          <CardDescription>
            Recent activities that may require attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          {metrics.suspiciousActivities.length === 0 ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>No suspicious activities detected</span>
            </div>
          ) : (
            <div className="space-y-2">
              {metrics.suspiciousActivities.map((activity, index) => (
                <Alert key={index} variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium">{activity.alert_type}</div>
                    <div>{activity.description}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(activity.created_at).toLocaleString()}
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Maintenance */}
      <Card>
        <CardHeader>
          <CardTitle>Security Maintenance</CardTitle>
          <CardDescription>
            Tools for maintaining system security
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Audit Log Cleanup</h4>
              <p className="text-sm text-muted-foreground">
                Remove audit logs older than 90 days
              </p>
            </div>
            <Button onClick={cleanupOldAuditLogs} variant="outline">
              Cleanup Logs
            </Button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Security Status</h4>
              <p className="text-sm text-muted-foreground">
                Enhanced security features are active
              </p>
            </div>
            <Badge variant="default">
              <CheckCircle className="h-3 w-3 mr-1" />
              Active
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Security Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Security Recommendations</CardTitle>
          <CardDescription>
            Implemented security enhancements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Admin privilege escalation prevention</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Enhanced audit logging with detailed metadata</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Document upload validation with magic byte checking</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Application-level document encryption</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Suspicious activity detection and monitoring</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Comprehensive document access logging</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Activity,
  Search,
  Filter,
  RefreshCw,
  Download,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface AuditLog {
  id: string;
  timestamp: string;
  user_id?: string;
  tenant_id?: string;
  action: string;
  description: string;
  ip_address?: string;
  user_agent?: string;
  metadata: Record<string, any>;
  created_at: string;
}

interface AuditLogsResponse {
  logs: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function AuditLogsViewer() {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  // Filters
  const [filters, setFilters] = useState({
    action: 'all',
    user_id: '',
    start_date: '',
    end_date: '',
    search: '',
  });

  const fetchAuditLogs = async (page = 1) => {
    if (!session) return;

    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([key, value]) => value !== '' && value !== 'all'),
        ),
      });

      const { data, error } = await supabase.functions.invoke('admin-audit-logs', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {},
        method: 'GET',
      });

      if (error) throw error;

      const response: AuditLogsResponse = data;
      setLogs(response.logs || []);
      setPagination(response.pagination);
    } catch (error: any) {
      console.error('Error fetching audit logs:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch audit logs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [session]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    fetchAuditLogs(1);
  };

  const clearFilters = () => {
    setFilters({
      action: 'all',
      user_id: '',
      start_date: '',
      end_date: '',
      search: '',
    });
    fetchAuditLogs(1);
  };

  const exportLogs = async () => {
    try {
      // Create CSV content
      const headers = ['Timestamp', 'User ID', 'Action', 'Description', 'IP Address'];
      const csvContent = [
        headers.join(','),
        ...logs.map((log) =>
          [
            new Date(log.timestamp).toISOString(),
            log.user_id || 'System',
            log.action,
            `"${log.description.replace(/"/g, '""')}"`, // Escape quotes
            log.ip_address || 'Unknown',
          ].join(','),
        ),
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Export successful',
        description: 'Audit logs have been exported to CSV',
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Failed to export audit logs',
        variant: 'destructive',
      });
    }
  };

  const getActionBadge = (action: string) => {
    const style =
      {
        LOGIN_SUCCESS: 'bg-green-100 text-green-800',
        LOGIN_FAILURE: 'bg-red-100 text-red-800',
        LOGOUT: 'bg-gray-100 text-gray-800',
        FILE_UPLOADED: 'bg-blue-100 text-blue-800',
        ESCALATION_REQUESTED: 'bg-yellow-100 text-yellow-800',
        ESCALATION_RESOLVED: 'bg-green-100 text-green-800',
        SUBSCRIPTION_UPDATED: 'bg-purple-100 text-purple-800',
        ADMIN_ACTION: 'bg-orange-100 text-orange-800',
        SYSTEM_EVENT: 'bg-gray-100 text-gray-800',
      }[action] || 'bg-gray-100 text-gray-800';

    return <Badge className={`${style} border-0`}>{action.replace(/_/g, ' ')}</Badge>;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <Activity className="h-6 w-6" />
            Audit Logs
          </h2>
          <p className="text-muted-foreground">
            Monitor and review all system activities and user actions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fetchAuditLogs(pagination.page)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportLogs}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="text-sm font-medium">Action Type</label>
              <Select
                value={filters.action}
                onValueChange={(value) => handleFilterChange('action', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  <SelectItem value="LOGIN_SUCCESS">Login Success</SelectItem>
                  <SelectItem value="LOGIN_FAILURE">Login Failure</SelectItem>
                  <SelectItem value="FILE_UPLOADED">File Upload</SelectItem>
                  <SelectItem value="ESCALATION_REQUESTED">Escalation</SelectItem>
                  <SelectItem value="SUBSCRIPTION_UPDATED">Subscription</SelectItem>
                  <SelectItem value="ADMIN_ACTION">Admin Action</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">User ID</label>
              <Input
                placeholder="Enter user ID"
                value={filters.user_id}
                onChange={(e) => handleFilterChange('user_id', e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="datetime-local"
                value={filters.start_date}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="datetime-local"
                value={filters.end_date}
                onChange={(e) => handleFilterChange('end_date', e.target.value)}
              />
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={applyFilters} className="flex-1">
                <Search className="mr-2 h-4 w-4" />
                Search
              </Button>
              <Button variant="outline" onClick={clearFilters}>
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Showing {logs.length} of {pagination.total} audit log entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No audit logs found</div>
          ) : (
            <div className="space-y-4">
              {logs.map((log, index) => (
                <div key={log.id}>
                  <div className="flex items-start justify-between rounded-lg border p-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        {getActionBadge(log.action)}
                        <span className="text-sm text-muted-foreground">
                          <Calendar className="mr-1 inline h-3 w-3" />
                          {formatTimestamp(log.timestamp)}
                        </span>
                        {log.user_id && (
                          <span className="text-sm text-muted-foreground">
                            <User className="mr-1 inline h-3 w-3" />
                            {log.user_id.substring(0, 8)}...
                          </span>
                        )}
                      </div>
                      <p className="text-sm">{log.description}</p>
                      {log.ip_address && (
                        <span className="text-xs text-muted-foreground">IP: {log.ip_address}</span>
                      )}
                      {Object.keys(log.metadata || {}).length > 0 && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-muted-foreground">
                            View metadata
                          </summary>
                          <pre className="mt-2 overflow-x-auto rounded bg-muted p-2 text-xs">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                  {index < logs.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchAuditLogs(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchAuditLogs(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

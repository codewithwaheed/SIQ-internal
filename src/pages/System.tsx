import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { UnifiedHeader } from '@/components/ui/unified-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Settings,
  Database,
  Shield,
  Cpu,
  HardDrive,
  Wifi,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
  Upload,
  Server,
  AlertCircle,
} from 'lucide-react';

interface SystemHealthData {
  cpu: number;
  memory: number;
  storage: number;
  network: string;
  uptime: string;
  services: Array<{
    name: string;
    status: string;
    uptime: string;
    lastRestart: string;
  }>;
  backup: {
    lastBackup: string;
    size: string;
    retention: string;
    nextScheduled: string;
  };
}

interface LogData {
  time: string;
  level: string;
  component: string;
  message: string;
}

const System = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [healthData, setHealthData] = useState<SystemHealthData | null>(null);
  const [logsData, setLogsData] = useState<LogData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [securitySettings, setSecuritySettings] = useState({
    twoFactor: false,
    rateLimiting: true,
    auditLogging: true,
    sessionTimeout: true,
  });
  const [backupInProgress, setBackupInProgress] = useState(false);

  // Check if user is admin
  if (userRole !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const fetchSystemData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch health data using supabase function invoke
      const { data: healthData, error: healthError } = await supabase.functions.invoke(
        'admin-system',
        {
          body: { action: 'health' },
        },
      );

      if (healthError) throw healthError;
      if (healthData) setHealthData(healthData);

      // Fetch logs data
      const { data: logsData, error: logsError } = await supabase.functions.invoke('admin-system', {
        body: { action: 'logs', limit: 10 },
      });

      if (logsError) throw logsError;
      if (logsData) setLogsData(logsData);

      // Fetch security settings from database
      const { data: securityData, error: securityError } = await supabase
        .from('security_settings')
        .select('setting_name, setting_value')
        .in('setting_name', [
          'two_factor_required',
          'rate_limiting_enabled',
          'audit_logging_enabled',
          'session_timeout_enabled',
        ]);

      if (!securityError && securityData) {
        const settings = {
          twoFactor: securityData.find((s) => s.setting_name === 'two_factor_required')
            ?.setting_value
            ? (
                securityData.find((s) => s.setting_name === 'two_factor_required')
                  ?.setting_value as any
              )?.enabled || false
            : false,
          rateLimiting: securityData.find((s) => s.setting_name === 'rate_limiting_enabled')
            ?.setting_value
            ? (
                securityData.find((s) => s.setting_name === 'rate_limiting_enabled')
                  ?.setting_value as any
              )?.enabled || true
            : true,
          auditLogging: securityData.find((s) => s.setting_name === 'audit_logging_enabled')
            ?.setting_value
            ? (
                securityData.find((s) => s.setting_name === 'audit_logging_enabled')
                  ?.setting_value as any
              )?.enabled || true
            : true,
          sessionTimeout: securityData.find((s) => s.setting_name === 'session_timeout_enabled')
            ?.setting_value
            ? (
                securityData.find((s) => s.setting_name === 'session_timeout_enabled')
                  ?.setting_value as any
              )?.enabled || true
            : true,
        };
        setSecuritySettings(settings);
      }
    } catch (error: any) {
      console.error('Error fetching system data:', error);
      setError(error.message || 'Failed to fetch system data');
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch system data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSecurityToggle = async (setting: string, value: boolean) => {
    // Optimistic update
    setSecuritySettings((prev) => ({ ...prev, [setting]: value }));

    try {
      // Map frontend setting names to database setting names
      const settingMap: Record<string, string> = {
        twoFactor: 'two_factor_required',
        rateLimiting: 'rate_limiting_enabled',
        auditLogging: 'audit_logging_enabled',
        sessionTimeout: 'session_timeout_enabled',
      };

      const dbSettingName = settingMap[setting];
      if (!dbSettingName) throw new Error('Unknown setting');

      // Update security setting in database
      const { error } = await supabase.from('security_settings').upsert({
        setting_name: dbSettingName,
        setting_value: { enabled: value, updated_at: new Date().toISOString() },
      });

      if (error) throw error;

      // Log the security change
      await supabase.functions.invoke('audit-log', {
        body: {
          action: 'SECURITY_SETTING_CHANGED',
          description: `Security setting ${dbSettingName} ${value ? 'enabled' : 'disabled'}`,
          metadata: {
            setting: dbSettingName,
            enabled: value,
            changed_by: user?.id,
          },
        },
      });

      toast({
        title: 'Success',
        description: 'Security setting updated successfully',
      });
    } catch (error: any) {
      // Revert optimistic update
      setSecuritySettings((prev) => ({ ...prev, [setting]: !value }));
      toast({
        title: 'Error',
        description: error.message || 'Failed to update security setting',
        variant: 'destructive',
      });
    }
  };

  const handleBackup = async () => {
    setBackupInProgress(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-system', {
        body: { action: 'backup' },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Backup started. Job ID: ${data?.jobId || 'unknown'}`,
      });

      // Refresh health data to show updated backup info
      setTimeout(() => {
        fetchSystemData();
      }, 2000);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to start backup',
        variant: 'destructive',
      });
    } finally {
      setBackupInProgress(false);
    }
  };

  useEffect(() => {
    fetchSystemData();
  }, []);

  const ErrorCard = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>{error}</span>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  );

  const LoadingCard = () => (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-4">
            <div className="mb-2 h-4 w-1/4 rounded bg-muted"></div>
            <div className="h-8 w-1/2 rounded bg-muted"></div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gradient-background">
        <AppSidebar />

        <div className="flex flex-1 flex-col">
          <UnifiedHeader context="dashboard" />

          <main className="flex-1 overflow-hidden">
            <div className="h-full p-6">
              <div className="mx-auto max-w-6xl space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="flex items-center gap-2 text-3xl font-bold">
                      <Settings className="h-8 w-8" />
                      System Administration
                    </h1>
                    <p className="text-muted-foreground">
                      Monitor and configure system settings, security, and infrastructure
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={fetchSystemData}
                    disabled={loading}
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh Status
                  </Button>
                </div>

                {error ? (
                  <ErrorCard error={error} onRetry={fetchSystemData} />
                ) : (
                  <>
                    {/* System Health Alert */}
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        {healthData?.network === 'healthy'
                          ? `All systems operational. Uptime: ${healthData?.uptime || '99.9%'}`
                          : loading
                            ? 'System monitoring in progress...'
                            : 'Unable to fetch system status'}
                      </AlertDescription>
                    </Alert>

                    {loading ? (
                      <LoadingCard />
                    ) : (
                      <>
                        {/* System Overview */}
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                          <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                              <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
                              <Cpu className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                              <div className="text-2xl font-bold">{healthData?.cpu || 0}%</div>
                              <Progress value={healthData?.cpu || 0} className="mt-2" />
                              <p className="mt-1 text-xs text-muted-foreground">
                                {(healthData?.cpu || 0) < 50 ? 'Normal load' : 'High load'}
                              </p>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                              <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                              <HardDrive className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                              <div className="text-2xl font-bold">{healthData?.memory || 0}%</div>
                              <Progress value={healthData?.memory || 0} className="mt-2" />
                              <p className="mt-1 text-xs text-muted-foreground">Memory usage</p>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                              <CardTitle className="text-sm font-medium">Storage</CardTitle>
                              <Database className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                              <div className="text-2xl font-bold">{healthData?.storage || 0}%</div>
                              <Progress value={healthData?.storage || 0} className="mt-2" />
                              <p className="mt-1 text-xs text-muted-foreground">Storage used</p>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                              <CardTitle className="text-sm font-medium">Network</CardTitle>
                              <Wifi className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                              <div className="text-2xl font-bold">
                                <Badge
                                  variant={
                                    healthData?.network === 'healthy' ? 'default' : 'secondary'
                                  }
                                >
                                  {healthData?.network || 'Checking...'}
                                </Badge>
                              </div>
                              <p className="mt-2 text-xs text-muted-foreground">Network status</p>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Services Status */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Server className="h-5 w-5" />
                              Service Status
                            </CardTitle>
                            <CardDescription>
                              Monitor critical system services and components
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {(healthData?.services || []).map((service, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between rounded-lg border p-3"
                              >
                                <div className="flex items-center gap-3">
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                  <div>
                                    <h4 className="font-medium">{service.name}</h4>
                                    <p className="text-sm text-muted-foreground">
                                      Last restart: {service.lastRestart}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <Badge variant="default" className="mb-1">
                                    {service.status}
                                  </Badge>
                                  <p className="text-sm text-muted-foreground">
                                    Uptime: {service.uptime}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                          {/* Security Settings */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                Security Configuration
                              </CardTitle>
                              <CardDescription>
                                Manage security settings and access controls
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium">Two-Factor Authentication</h4>
                                  <p className="text-sm text-muted-foreground">
                                    Require 2FA for all admin accounts
                                  </p>
                                </div>
                                <Switch
                                  checked={securitySettings.twoFactor}
                                  onCheckedChange={(checked) =>
                                    handleSecurityToggle('twoFactor', checked)
                                  }
                                />
                              </div>

                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium">API Rate Limiting</h4>
                                  <p className="text-sm text-muted-foreground">
                                    Protect against abuse and DoS attacks
                                  </p>
                                </div>
                                <Switch
                                  checked={securitySettings.rateLimiting}
                                  onCheckedChange={(checked) =>
                                    handleSecurityToggle('rateLimiting', checked)
                                  }
                                />
                              </div>

                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium">Audit Logging</h4>
                                  <p className="text-sm text-muted-foreground">
                                    Log all administrative actions
                                  </p>
                                </div>
                                <Switch
                                  checked={securitySettings.auditLogging}
                                  onCheckedChange={(checked) =>
                                    handleSecurityToggle('auditLogging', checked)
                                  }
                                />
                              </div>

                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium">Session Timeout</h4>
                                  <p className="text-sm text-muted-foreground">
                                    Auto-logout after inactivity
                                  </p>
                                </div>
                                <Switch
                                  checked={securitySettings.sessionTimeout}
                                  onCheckedChange={(checked) =>
                                    handleSecurityToggle('sessionTimeout', checked)
                                  }
                                />
                              </div>

                              <div className="border-t pt-4">
                                <Button
                                  variant="outline"
                                  className="w-full"
                                  onClick={() => window.open('/security-test', '_blank')}
                                >
                                  View Security Logs
                                </Button>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Backup & Maintenance */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                                <Database className="h-5 w-5" />
                                Backup & Maintenance
                              </CardTitle>
                              <CardDescription>
                                Database backups and system maintenance schedules
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">Last Backup</span>
                                  <Badge variant="default">
                                    {healthData?.backup?.lastBackup
                                      ? new Date(healthData.backup.lastBackup).toLocaleString()
                                      : 'Never'}
                                  </Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">Backup Size</span>
                                  <span className="text-sm">
                                    {healthData?.backup?.size || 'N/A'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">Retention</span>
                                  <span className="text-sm">
                                    {healthData?.backup?.retention || '30 days'}
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <Button variant="outline" className="flex-1">
                                  <Download className="mr-2 h-4 w-4" />
                                  Download
                                </Button>
                                <Button
                                  variant="outline"
                                  className="flex-1"
                                  onClick={handleBackup}
                                  disabled={backupInProgress}
                                >
                                  {backupInProgress ? (
                                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-current" />
                                  ) : (
                                    <Upload className="mr-2 h-4 w-4" />
                                  )}
                                  Create Backup
                                </Button>
                              </div>

                              <div className="space-y-2 border-t pt-4">
                                <h4 className="font-medium">Maintenance Windows</h4>
                                <div className="text-sm text-muted-foreground">
                                  <p>
                                    Next scheduled:{' '}
                                    {healthData?.backup?.nextScheduled || 'Sunday 2:00 AM UTC'}
                                  </p>
                                  <p>Duration: ~30 minutes</p>
                                </div>
                                <Button variant="outline" size="sm">
                                  Configure Schedule
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* System Logs */}
                        <Card>
                          <CardHeader>
                            <CardTitle>Recent System Logs</CardTitle>
                            <CardDescription>
                              View recent system events and error logs
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            {logsData.length === 0 ? (
                              <div className="py-8 text-center">
                                <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                                <p className="text-muted-foreground">No recent logs available</p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {logsData.map((log, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center gap-3 rounded border p-2"
                                  >
                                    <Badge
                                      variant="outline"
                                      className={`text-xs ${
                                        log.level === 'ERROR'
                                          ? 'border-red-200 text-red-700'
                                          : log.level === 'WARN'
                                            ? 'border-yellow-200 text-yellow-700'
                                            : 'border-blue-200 text-blue-700'
                                      }`}
                                    >
                                      {log.level}
                                    </Badge>
                                    <span className="font-mono text-sm text-muted-foreground">
                                      {log.time}
                                    </span>
                                    <span className="text-sm font-medium">[{log.component}]</span>
                                    <span className="flex-1 text-sm">{log.message}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="mt-4">
                              <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => window.open('/admin/audit-logs', '_blank')}
                              >
                                View All Logs
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default System;

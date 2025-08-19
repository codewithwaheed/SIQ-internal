import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Server, 
  Database, 
  Activity, 
  Wifi, 
  HardDrive, 
  Cpu, 
  MemoryStick,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  RefreshCw
} from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/hooks/use-toast';

interface SystemMetrics {
  apiHealth: {
    status: 'healthy' | 'degraded' | 'down';
    responseTime: number;
    uptime: string;
    lastCheck: string;
  };
  database: {
    status: 'optimal' | 'slow' | 'error';
    connections: number;
    maxConnections: number;
    queryTime: number;
  };
  storage: {
    used: number;
    total: number;
    percentage: number;
  };
  performance: {
    cpuUsage: number;
    memoryUsage: number;
    diskIO: number;
  };
  services: {
    vectorSearch: 'active' | 'inactive' | 'error';
    aiModel: 'available' | 'limited' | 'unavailable';
    notifications: 'active' | 'inactive';
    fileProcessing: 'active' | 'backlogged' | 'error';
  };
  alerts: Array<{
    id: string;
    type: 'critical' | 'warning' | 'info';
    message: string;
    timestamp: string;
  }>;
}

export const SystemHealthDashboard = () => {
  const [refreshing, setRefreshing] = useState(false);
  const { data: metrics, loading, error, refetch } = useApi<SystemMetrics>('admin-analytics/system-health');
  const { toast } = useToast();

  const refreshHealth = async () => {
    setRefreshing(true);
    try {
      await refetch();
      toast({
        title: "Success",
        description: "System health data refreshed",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh system health data",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'optimal':
      case 'active':
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'degraded':
      case 'slow':
      case 'limited':
      case 'backlogged':
        return 'bg-yellow-100 text-yellow-800';
      case 'down':
      case 'error':
      case 'inactive':
      case 'unavailable':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">System Health Check Failed</h3>
            <p className="text-muted-foreground mb-4">Unable to retrieve system health data</p>
            <Button onClick={refreshHealth} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Mock data for demo purposes
  const mockMetrics: SystemMetrics = {
    apiHealth: {
      status: 'healthy',
      responseTime: 245,
      uptime: '99.97%',
      lastCheck: '2 minutes ago'
    },
    database: {
      status: 'optimal',
      connections: 12,
      maxConnections: 100,
      queryTime: 85
    },
    storage: {
      used: 68,
      total: 100,
      percentage: 68
    },
    performance: {
      cpuUsage: 45,
      memoryUsage: 72,
      diskIO: 35
    },
    services: {
      vectorSearch: 'active',
      aiModel: 'available',
      notifications: 'active',
      fileProcessing: 'active'
    },
    alerts: []
  };

  const displayMetrics = metrics || mockMetrics;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">System Health</h2>
          <p className="text-muted-foreground">Monitor system performance and service status</p>
        </div>
        <Button variant="outline" onClick={refreshHealth} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Critical Alerts */}
      {displayMetrics?.alerts && displayMetrics.alerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              Active Alerts ({displayMetrics.alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {displayMetrics.alerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-3 p-3 bg-white rounded-lg border">
                  {getAlertIcon(alert.type)}
                  <div className="flex-1">
                    <p className="font-medium">{alert.message}</p>
                    <p className="text-sm text-muted-foreground">{alert.timestamp}</p>
                  </div>
                  <Badge variant="outline" className={
                    alert.type === 'critical' ? 'border-red-200 text-red-800' : 
                    alert.type === 'warning' ? 'border-yellow-200 text-yellow-800' : 
                    'border-blue-200 text-blue-800'
                  }>
                    {alert.type}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* System Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Server className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">API Health</p>
                    <Badge className={getStatusColor(displayMetrics?.apiHealth.status || 'unknown')}>
                      {displayMetrics?.apiHealth.status || 'Unknown'}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {displayMetrics?.apiHealth.responseTime}ms response
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Database className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Database</p>
                    <Badge className={getStatusColor(displayMetrics?.database.status || 'unknown')}>
                      {displayMetrics?.database.status || 'Unknown'}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {displayMetrics?.database.connections}/{displayMetrics?.database.maxConnections} connections
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Activity className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Vector Search</p>
                    <Badge className={getStatusColor(displayMetrics?.services.vectorSearch || 'unknown')}>
                      {displayMetrics?.services.vectorSearch || 'Unknown'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Zap className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">AI Model</p>
                    <Badge className={getStatusColor(displayMetrics?.services.aiModel || 'unknown')}>
                      {displayMetrics?.services.aiModel || 'Unknown'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Uptime & Response Time */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Uptime</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {displayMetrics?.apiHealth.uptime || '99.9%'}
                  </div>
                  <p className="text-muted-foreground">Last 30 days</p>
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">
                      Last checked: {displayMetrics?.apiHealth.lastCheck || 'Unknown'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Response Times</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>API Response</span>
                    <span>{displayMetrics?.apiHealth.responseTime || 0}ms</span>
                  </div>
                  <Progress value={Math.min((displayMetrics?.apiHealth.responseTime || 0) / 1000 * 100, 100)} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Database Query</span>
                    <span>{displayMetrics?.database.queryTime || 0}ms</span>
                  </div>
                  <Progress value={Math.min((displayMetrics?.database.queryTime || 0) / 500 * 100, 100)} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  CPU Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold mb-2">
                    {displayMetrics?.performance.cpuUsage || 0}%
                  </div>
                  <Progress value={displayMetrics?.performance.cpuUsage || 0} className="mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {(displayMetrics?.performance.cpuUsage || 0) < 70 ? 'Normal' : 
                     (displayMetrics?.performance.cpuUsage || 0) < 90 ? 'High' : 'Critical'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MemoryStick className="h-5 w-5" />
                  Memory Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold mb-2">
                    {displayMetrics?.performance.memoryUsage || 0}%
                  </div>
                  <Progress value={displayMetrics?.performance.memoryUsage || 0} className="mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {(displayMetrics?.performance.memoryUsage || 0) < 80 ? 'Normal' : 
                     (displayMetrics?.performance.memoryUsage || 0) < 95 ? 'High' : 'Critical'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  Disk I/O
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold mb-2">
                    {displayMetrics?.performance.diskIO || 0}%
                  </div>
                  <Progress value={displayMetrics?.performance.diskIO || 0} className="mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {(displayMetrics?.performance.diskIO || 0) < 80 ? 'Normal' : 'High'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="services" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(displayMetrics?.services || {}).map(([service, status]) => (
              <Card key={service}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold capitalize">
                        {service.replace(/([A-Z])/g, ' $1').trim()}
                      </h3>
                      <p className="text-sm text-muted-foreground">Service status</p>
                    </div>
                    <Badge className={getStatusColor(status)}>
                      {status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="storage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Storage Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Used Storage</span>
                  <span className="font-medium">
                    {displayMetrics?.storage.used || 0} GB / {displayMetrics?.storage.total || 0} GB
                  </span>
                </div>
                <Progress value={displayMetrics?.storage.percentage || 0} />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{displayMetrics?.storage.percentage || 0}% used</span>
                  <span>{(displayMetrics?.storage.total || 0) - (displayMetrics?.storage.used || 0)} GB available</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
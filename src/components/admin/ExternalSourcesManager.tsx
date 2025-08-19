import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Play, Pause, RefreshCw, Plus, Calendar, Activity, CheckCircle, XCircle, Clock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";

interface ExternalSource {
  id: string;
  name: string;
  source_type: string;
  base_url: string;
  api_key_required: boolean;
  sync_frequency: string;
  last_sync_at: string | null;
  next_sync_at: string | null;
  is_active: boolean;
  sync_status: string;
  framework_category: string;
  content_type: string;
  metadata: any;
  created_at: string;
  updated_at: string;
}

interface SyncLog {
  id: string;
  source_id: string;
  sync_started_at: string;
  sync_completed_at: string | null;
  status: string;
  documents_processed: number;
  documents_added: number;
  documents_updated: number;
  documents_skipped: number;
  error_message: string | null;
  external_sources: {
    name: string;
    source_type: string;
  };
}

export const ExternalSourcesManager = () => {
  const { toast } = useToast();
  const [sources, setSources] = useState<ExternalSource[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);

  const [newSource, setNewSource] = useState({
    name: '',
    source_type: '',
    base_url: '',
    framework_category: '',
    content_type: '',
    sync_frequency: 'daily',
    api_key_required: false
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load sources
      const { data: sourcesData, error: sourcesError } = await supabase.functions.invoke('sync-external-sources', {
        body: { action: 'list-sources' }
      });

      if (sourcesError) throw sourcesError;
      setSources(sourcesData.sources || []);

      // Load sync logs
      const { data: logsData, error: logsError } = await supabase.functions.invoke('sync-external-sources', {
        body: { action: 'sync-logs' }
      });

      if (logsError) throw logsError;
      setSyncLogs(logsData.logs || []);

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load external sources data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (sourceId?: string) => {
    try {
      const syncId = sourceId || 'all';
      setSyncing(prev => [...prev, syncId]);

      const { data, error } = await supabase.functions.invoke('sync-external-sources', {
        body: sourceId ? { action: 'sync', sourceId } : { action: 'sync' }
      });

      if (error) throw error;

      toast({
        title: "Sync Started",
        description: data.message,
      });

      // Reload data after a short delay
      setTimeout(() => {
        loadData();
      }, 2000);

    } catch (error) {
      console.error('Error starting sync:', error);
      toast({
        title: "Error",
        description: "Failed to start sync",
        variant: "destructive",
      });
    } finally {
      setSyncing(prev => prev.filter(id => id !== (sourceId || 'all')));
    }
  };

  const toggleSourceStatus = async (sourceId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('external_sources')
        .update({ is_active: !currentStatus })
        .eq('id', sourceId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Source ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      });

      loadData();
    } catch (error) {
      console.error('Error toggling source status:', error);
      toast({
        title: "Error",
        description: "Failed to update source status",
        variant: "destructive",
      });
    }
  };

  const addNewSource = async () => {
    try {
      const { error } = await supabase
        .from('external_sources')
        .insert(newSource);

      if (error) throw error;

      toast({
        title: "Success",
        description: "External source added successfully",
      });

      setNewSource({
        name: '',
        source_type: '',
        base_url: '',
        framework_category: '',
        content_type: '',
        sync_frequency: 'daily',
        api_key_required: false
      });
      setShowAddForm(false);
      loadData();
    } catch (error) {
      console.error('Error adding source:', error);
      toast({
        title: "Error",
        description: "Failed to add external source",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const sourceTypes = [
    { value: 'nist', label: 'NIST' },
    { value: 'mitre', label: 'MITRE' },
    { value: 'cve', label: 'CVE Database' },
    { value: 'rss', label: 'RSS Feed' },
    { value: 'api', label: 'API' },
    { value: 'generic', label: 'Generic Web Scraping' }
  ];

  const frameworkCategories = [
    { value: 'NIST', label: 'NIST' },
    { value: 'ISO27001', label: 'ISO 27001' },
    { value: 'SOC2', label: 'SOC 2' },
    { value: 'CMMC', label: 'CMMC' },
    { value: 'HIPAA', label: 'HIPAA' },
    { value: 'FedRAMP', label: 'FedRAMP' },
    { value: 'general', label: 'General' }
  ];

  const contentTypes = [
    { value: 'framework_documentation', label: 'Framework Documentation' },
    { value: 'best_practices', label: 'Best Practices' },
    { value: 'standard_reference', label: 'Standard Reference' },
    { value: 'vulnerability_data', label: 'Vulnerability Data' },
    { value: 'threat_intelligence', label: 'Threat Intelligence' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">External Sources Manager</h2>
          <p className="text-muted-foreground">
            Manage automated cybersecurity content ingestion from external sources
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => handleSync()}
            disabled={syncing.includes('all')}
            variant="outline"
          >
            {syncing.includes('all') ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Syncing All...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync All
              </>
            )}
          </Button>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Source
          </Button>
        </div>
      </div>

      <Tabs defaultValue="sources" className="space-y-6">
        <TabsList>
          <TabsTrigger value="sources">External Sources</TabsTrigger>
          <TabsTrigger value="logs">Sync Logs</TabsTrigger>
          {showAddForm && <TabsTrigger value="add">Add New Source</TabsTrigger>}
        </TabsList>

        <TabsContent value="sources" className="space-y-4">
          {sources.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Activity className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No External Sources</h3>
                <p className="text-muted-foreground text-center">
                  Add external sources to automatically sync cybersecurity content
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {sources.map((source) => (
                <Card key={source.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{source.name}</h3>
                          <Badge variant={source.is_active ? "default" : "secondary"}>
                            {source.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant="outline">
                            {source.source_type.toUpperCase()}
                          </Badge>
                          {getStatusIcon(source.sync_status)}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          <div>
                            <p className="text-sm text-muted-foreground">Framework</p>
                            <p className="font-medium">{source.framework_category}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Content Type</p>
                            <p className="font-medium">{source.content_type.replace('_', ' ')}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Last Sync</p>
                            <p className="font-medium">{formatDate(source.last_sync_at)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Next Sync</p>
                            <p className="font-medium">{formatDate(source.next_sync_at)}</p>
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground mb-2">
                          <strong>URL:</strong> {source.base_url}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <strong>Frequency:</strong> {source.sync_frequency}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Switch
                          checked={source.is_active}
                          onCheckedChange={() => toggleSourceStatus(source.id, source.is_active)}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSync(source.id)}
                          disabled={syncing.includes(source.id) || !source.is_active}
                        >
                          {syncing.includes(source.id) ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          {syncLogs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Sync Logs</h3>
                <p className="text-muted-foreground">
                  Sync logs will appear here after running synchronizations
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {syncLogs.map((log) => (
                <Card key={log.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(log.status)}
                        <h4 className="font-semibold">{log.external_sources.name}</h4>
                        <Badge variant="outline">{log.external_sources.source_type}</Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(log.sync_started_at)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Processed</p>
                        <p className="font-medium">{log.documents_processed}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Added</p>
                        <p className="font-medium text-green-600">{log.documents_added}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Updated</p>
                        <p className="font-medium text-blue-600">{log.documents_updated}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Skipped</p>
                        <p className="font-medium text-gray-600">{log.documents_skipped}</p>
                      </div>
                    </div>

                    {log.error_message && (
                      <div className="flex items-center gap-2 mt-2 p-2 bg-red-50 border border-red-200 rounded">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        <p className="text-sm text-red-700">{log.error_message}</p>
                      </div>
                    )}

                    {log.sync_completed_at && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Completed: {formatDate(log.sync_completed_at)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {showAddForm && (
          <TabsContent value="add" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Add New External Source</CardTitle>
                <CardDescription>
                  Configure a new external source for automated content ingestion
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Source Name</Label>
                    <Input
                      id="name"
                      value={newSource.name}
                      onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                      placeholder="e.g., NIST Cybersecurity Framework"
                    />
                  </div>

                  <div>
                    <Label htmlFor="source_type">Source Type</Label>
                    <Select
                      value={newSource.source_type}
                      onValueChange={(value) => setNewSource({ ...newSource, source_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select source type" />
                      </SelectTrigger>
                      <SelectContent>
                        {sourceTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="framework_category">Framework Category</Label>
                    <Select
                      value={newSource.framework_category}
                      onValueChange={(value) => setNewSource({ ...newSource, framework_category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select framework" />
                      </SelectTrigger>
                      <SelectContent>
                        {frameworkCategories.map((framework) => (
                          <SelectItem key={framework.value} value={framework.value}>
                            {framework.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="content_type">Content Type</Label>
                    <Select
                      value={newSource.content_type}
                      onValueChange={(value) => setNewSource({ ...newSource, content_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select content type" />
                      </SelectTrigger>
                      <SelectContent>
                        {contentTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="base_url">Base URL</Label>
                  <Input
                    id="base_url"
                    value={newSource.base_url}
                    onChange={(e) => setNewSource({ ...newSource, base_url: e.target.value })}
                    placeholder="https://example.com/api/feed"
                  />
                </div>

                <div>
                  <Label htmlFor="sync_frequency">Sync Frequency</Label>
                  <Select
                    value={newSource.sync_frequency}
                    onValueChange={(value) => setNewSource({ ...newSource, sync_frequency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="api_key_required"
                    checked={newSource.api_key_required}
                    onCheckedChange={(checked) => setNewSource({ ...newSource, api_key_required: checked })}
                  />
                  <Label htmlFor="api_key_required">Requires API Key</Label>
                </div>

                <div className="flex gap-2">
                  <Button onClick={addNewSource} className="flex-1">
                    Add Source
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};
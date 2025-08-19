import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useApi, apiCall } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  AlertCircle,
  Upload,
  FileText,
  Trash2,
  Eye,
  Download,
  RefreshCw,
  Satellite,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ExternalSourcesManager } from './ExternalSourcesManager';

interface MasterKnowledgeDocument {
  id: string;
  title: string;
  description: string;
  content_type: string;
  framework_category: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  processing_status: string;
  version: string;
  is_active: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export const MasterKnowledgeManager = () => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    contentType: '',
    frameworkCategory: '',
    tags: '',
  });

  // Use real API endpoints
  const { data: documentsData, loading, refetch } = useApi('upload-master-knowledge?action=list');
  const documents = documentsData?.documents || [];

  const contentTypes = [
    { value: 'framework_documentation', label: 'Framework Documentation' },
    { value: 'best_practices', label: 'Best Practices' },
    { value: 'policy_template', label: 'Policy Template' },
    { value: 'implementation_guide', label: 'Implementation Guide' },
    { value: 'standard_reference', label: 'Standard Reference' },
  ];

  const frameworkCategories = [
    { value: 'NIST', label: 'NIST' },
    { value: 'ISO27001', label: 'ISO 27001' },
    { value: 'SOC2', label: 'SOC 2' },
    { value: 'CMMC', label: 'CMMC' },
    { value: 'HIPAA', label: 'HIPAA' },
    { value: 'FedRAMP', label: 'FedRAMP' },
    { value: 'PCI_DSS', label: 'PCI DSS' },
    { value: 'GDPR', label: 'GDPR' },
    { value: 'general', label: 'General' },
  ];

  // Set up real-time subscription for status updates
  useEffect(() => {
    const channel = supabase
      .channel('master-knowledge-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'master_knowledge_base',
        },
        (payload) => {
          console.log('Real-time update:', payload);
          refetch(); // Refetch data when changes occur
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const handleFileUpload = async () => {
    if (
      !selectedFile ||
      !uploadForm.title ||
      !uploadForm.contentType ||
      !uploadForm.frameworkCategory
    ) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields and select a file',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      console.log('Starting file upload...', {
        file: selectedFile?.name,
        title: uploadForm.title,
        contentType: uploadForm.contentType,
        frameworkCategory: uploadForm.frameworkCategory,
      });

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', uploadForm.title);
      formData.append('description', uploadForm.description);
      formData.append('contentType', uploadForm.contentType);
      formData.append('frameworkCategory', uploadForm.frameworkCategory);
      formData.append(
        'tags',
        JSON.stringify(
          uploadForm.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
        ),
      );

      console.log('Calling upload-master-knowledge function...');
      const { data, error } = await supabase.functions.invoke('upload-master-knowledge', {
        body: formData,
      });

      console.log('Function response:', { data, error });

      if (error) throw error;

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Master knowledge document uploaded successfully',
        });

        // Reset form
        setSelectedFile(null);
        setUploadForm({
          title: '',
          description: '',
          contentType: '',
          frameworkCategory: '',
          tags: '',
        });

        // Reload documents
        refetch();
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload document',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const toggleDocumentStatus = async (documentId: string, currentStatus: boolean) => {
    try {
      await apiCall(`upload-master-knowledge/${documentId}`, {
        method: 'PATCH',
        body: { is_active: !currentStatus },
      });

      toast({
        title: 'Success',
        description: `Document ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      });

      refetch();
    } catch (error) {
      console.error('Error toggling document status:', error);
    }
  };

  const deleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }

    try {
      await apiCall(`upload-master-knowledge/${documentId}`, {
        method: 'DELETE',
      });

      toast({
        title: 'Success',
        description: 'Document deleted successfully',
      });

      refetch();
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-500', text: 'Pending' },
      processing: { color: 'bg-blue-500', text: 'Processing' },
      completed: { color: 'bg-green-500', text: 'Completed' },
      failed: { color: 'bg-red-500', text: 'Failed' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return <Badge className={`${config.color} text-white`}>{config.text}</Badge>;
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Master Knowledge Base Manager</h1>
          <p className="text-muted-foreground">
            Manage cybersecurity framework documents and knowledge base content
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList>
          <TabsTrigger value="upload">Upload Document</TabsTrigger>
          <TabsTrigger value="manage">Manage Documents</TabsTrigger>
          <TabsTrigger value="external">External Sources</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Master Knowledge Document
              </CardTitle>
              <CardDescription>
                Upload cybersecurity framework documents to the master knowledge base
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    placeholder="Document title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contentType">Content Type *</Label>
                  <Select
                    value={uploadForm.contentType}
                    onValueChange={(value) => setUploadForm({ ...uploadForm, contentType: value })}
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

                <div className="space-y-2">
                  <Label htmlFor="frameworkCategory">Framework Category *</Label>
                  <Select
                    value={uploadForm.frameworkCategory}
                    onValueChange={(value) =>
                      setUploadForm({ ...uploadForm, frameworkCategory: value })
                    }
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

                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={uploadForm.tags}
                    onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })}
                    placeholder="security, compliance, audit"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={uploadForm.description}
                  onChange={(e) =>
                    setUploadForm({
                      ...uploadForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="Document description and purpose"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">Document File *</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.txt,.docx"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
                <p className="text-sm text-muted-foreground">
                  Supported formats: PDF, TXT, DOCX (Max 50MB)
                </p>
              </div>

              <Button onClick={handleFileUpload} disabled={uploading} className="w-full">
                {uploading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Document
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Master Knowledge Documents ({documents.length})
              </CardTitle>
              <CardDescription>View and manage all master knowledge base documents</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
                </div>
              ) : documents.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No documents uploaded yet
                </div>
              ) : (
                <div className="space-y-4">
                  {documents.map((doc) => (
                    <Card key={doc.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="mb-2 flex items-center gap-2">
                              <h3 className="font-semibold">{doc.title}</h3>
                              {getStatusBadge(doc.processing_status)}
                              <Badge variant={doc.is_active ? 'default' : 'secondary'}>
                                {doc.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>

                            <p className="mb-2 text-sm text-muted-foreground">{doc.description}</p>

                            <div className="mb-2 flex flex-wrap gap-2">
                              <Badge variant="outline">{doc.framework_category}</Badge>
                              <Badge variant="outline">{doc.content_type.replace('_', ' ')}</Badge>
                              <Badge variant="outline">{formatFileSize(doc.file_size)}</Badge>
                            </div>

                            {doc.tags && doc.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {doc.tags.map((tag, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="ml-4 flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleDocumentStatus(doc.id, doc.is_active)}
                            >
                              {doc.is_active ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteDocument(doc.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {doc.processing_status === 'processing' && (
                          <div className="mt-2">
                            <div className="mb-2 flex items-center gap-2">
                              <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-primary" />
                              <span className="text-sm font-medium">Processing...</span>
                            </div>
                            <Progress value={75} className="h-2" />
                            <p className="mt-1 text-xs text-muted-foreground">
                              Extracting text and generating embeddings... Status updates in
                              real-time.
                            </p>
                          </div>
                        )}

                        {doc.processing_status === 'failed' && (
                          <div className="mt-2 flex items-center gap-2 text-red-600">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm">Processing failed</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="external" className="space-y-6">
          <ExternalSourcesManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

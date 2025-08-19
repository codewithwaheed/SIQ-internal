import { useState, useEffect } from 'react';
import { DashboardLayout } from './DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  FileText, 
  MessageSquare, 
  ExternalLink, 
  Plus,
  Copy,
  Edit,
  Trash2,
  BookOpen,
  Shield,
  Search,
  Link,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Template {
  id: string;
  title: string;
  category: string;
  content: string;
  tags: string[];
  description?: string;
  is_shared: boolean;
  created_at: string;
  user_id: string;
}

interface CannedResponse {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  description?: string;
  is_shared: boolean;
  use_count: number;
  created_at: string;
  user_id: string;
}

interface ResourceLink {
  id: string;
  title: string;
  url: string;
  description?: string;
  category: string;
  tags: string[];
  is_shared: boolean;
  access_count: number;
  created_at: string;
  user_id: string;
}

export const ToolsTemplates = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);
  const [resourceLinks, setResourceLinks] = useState<ResourceLink[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const [isAddingResponse, setIsAddingResponse] = useState(false);
  const [isAddingLink, setIsAddingLink] = useState(false);
  
  const [newTemplate, setNewTemplate] = useState({ 
    title: '', 
    category: '', 
    content: '', 
    tags: '', 
    description: '',
    is_shared: false 
  });
  const [newResponse, setNewResponse] = useState({ 
    title: '', 
    category: '', 
    content: '',
    tags: '',
    description: '',
    is_shared: false
  });
  const [newLink, setNewLink] = useState({ 
    title: '', 
    url: '', 
    description: '', 
    category: '',
    tags: '',
    is_shared: false
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('policy_templates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (templatesError) throw templatesError;

      // Load canned responses
      const { data: responsesData, error: responsesError } = await supabase
        .from('canned_responses')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (responsesError) throw responsesError;

      // Load resource links
      const { data: linksData, error: linksError } = await supabase
        .from('resource_links')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (linksError) throw linksError;

      setTemplates(templatesData || []);
      setCannedResponses(responsesData || []);
      setResourceLinks(linksData || []);

      // Initialize with default data if empty
      if (templatesData?.length === 0) {
        await initializeDefaultTemplates();
      }
      if (responsesData?.length === 0) {
        await initializeDefaultResponses();
      }
      if (linksData?.length === 0) {
        await initializeDefaultLinks();
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load templates and resources');
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultTemplates = async () => {
    const defaultTemplates = [
      {
        title: 'NIST 800-171 Access Control Policy',
        category: 'policy',
        content: `# Access Control Policy Template

## 1. Purpose
This policy establishes requirements for controlling access to [ORGANIZATION] systems and information.

## 2. Scope
This policy applies to all information systems and users within [ORGANIZATION].

## 3. Requirements
- Users must be uniquely identified and authenticated
- Access permissions must be reviewed quarterly
- Privileged access must be logged and monitored

## 4. Implementation
[Add specific implementation details here]`,
        tags: ['NIST', 'Access Control', 'Policy'],
        description: 'Template for creating NIST 800-171 compliant access control policies',
        is_shared: true
      },
      {
        title: 'CMMC Level 2 Assessment Checklist',
        category: 'assessment',
        content: `# CMMC Level 2 Assessment Checklist

## Access Control (AC)
- [ ] AC.L2-3.1.1 - Authorized access enforcement
- [ ] AC.L2-3.1.2 - Transaction and function controls
- [ ] AC.L2-3.1.3 - External connections control

## Awareness and Training (AT)
- [ ] AT.L2-3.2.1 - Security awareness training
- [ ] AT.L2-3.2.2 - Insider threat awareness

## Audit and Accountability (AU)
- [ ] AU.L2-3.3.1 - Event logging
- [ ] AU.L2-3.3.2 - Centralized audit log management`,
        tags: ['CMMC', 'Assessment', 'Checklist'],
        description: 'Comprehensive checklist for CMMC Level 2 assessments',
        is_shared: true
      }
    ];

    for (const template of defaultTemplates) {
      await supabase.from('policy_templates').insert({
        ...template,
        user_id: user?.id
      });
    }
    
    await loadData();
  };

  const initializeDefaultResponses = async () => {
    const defaultResponses = [
      {
        title: 'Initial Escalation Response',
        category: 'escalation',
        content: `Thank you for escalating this issue. I've received your request and will review the details within the next 2 hours. 

Based on the information provided, this appears to be a [PRIORITY] priority issue. I'll analyze your current security posture and provide specific recommendations.

Expected response time: [TIMEFRAME]
Next steps: [SPECIFIC ACTIONS]

Best regards,
[CONSULTANT NAME]`,
        tags: ['escalation', 'initial', 'response'],
        description: 'Standard initial response for escalated security issues',
        is_shared: true
      },
      {
        title: 'NIST 800-171 Compliance Gap Response',
        category: 'compliance',
        content: `I've reviewed your NIST 800-171 compliance assessment and identified several key areas that need attention:

## Priority 1 Issues:
- [List high priority gaps]

## Priority 2 Issues:
- [List medium priority gaps]

## Recommended Next Steps:
1. [Immediate action item]
2. [Short-term action item]
3. [Long-term action item]

I'll prepare a detailed remediation plan with timelines and cost estimates. Would you like to schedule a call to discuss these findings?`,
        tags: ['NIST', 'compliance', 'gap analysis'],
        description: 'Template response for NIST 800-171 compliance assessments',
        is_shared: true
      }
    ];

    for (const response of defaultResponses) {
      await supabase.from('canned_responses').insert({
        ...response,
        user_id: user?.id
      });
    }
    
    await loadData();
  };

  const initializeDefaultLinks = async () => {
    const defaultLinks = [
      {
        title: 'NIST 800-171 Rev 2',
        url: 'https://csrc.nist.gov/publications/detail/sp/800-171/rev-2/final',
        description: 'Protecting Controlled Unclassified Information in Nonfederal Systems',
        category: 'standards',
        tags: ['NIST', 'standards', 'CUI'],
        is_shared: true
      },
      {
        title: 'CISA Cybersecurity Toolkit',
        url: 'https://www.cisa.gov/resources-tools',
        description: 'Comprehensive cybersecurity resources and tools',
        category: 'tools',
        tags: ['CISA', 'tools', 'resources'],
        is_shared: true
      },
      {
        title: 'FedRAMP Security Controls',
        url: 'https://www.fedramp.gov/understanding-baselines-and-impact-levels/',
        description: 'Security control baselines for cloud service providers',
        category: 'standards',
        tags: ['FedRAMP', 'cloud', 'controls'],
        is_shared: true
      },
      {
        title: 'CMMC Assessment Guide',
        url: 'https://www.acq.osd.mil/cmmc/',
        description: 'Official CMMC program resources and guidance',
        category: 'standards',
        tags: ['CMMC', 'assessment', 'DoD'],
        is_shared: true
      }
    ];

    for (const link of defaultLinks) {
      await supabase.from('resource_links').insert({
        ...link,
        user_id: user?.id
      });
    }
    
    await loadData();
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard');
  };

  const addTemplate = async () => {
    if (!newTemplate.title || !newTemplate.content) {
      toast.error('Please fill in title and content');
      return;
    }

    setIsAddingTemplate(true);
    try {
      const { error } = await supabase.from('policy_templates').insert({
        title: newTemplate.title,
        category: newTemplate.category || 'general',
        content: newTemplate.content,
        tags: newTemplate.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        description: newTemplate.description,
        is_shared: newTemplate.is_shared,
        user_id: user?.id
      });

      if (error) throw error;

      setNewTemplate({ title: '', category: '', content: '', tags: '', description: '', is_shared: false });
      toast.success('Template added successfully');
      await loadData();
    } catch (error) {
      console.error('Error adding template:', error);
      toast.error('Failed to add template');
    } finally {
      setIsAddingTemplate(false);
    }
  };

  const addCannedResponse = async () => {
    if (!newResponse.title || !newResponse.content) {
      toast.error('Please fill in title and content');
      return;
    }

    setIsAddingResponse(true);
    try {
      const { error } = await supabase.from('canned_responses').insert({
        title: newResponse.title,
        category: newResponse.category || 'general',
        content: newResponse.content,
        tags: newResponse.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        description: newResponse.description,
        is_shared: newResponse.is_shared,
        user_id: user?.id
      });

      if (error) throw error;

      setNewResponse({ title: '', category: '', content: '', tags: '', description: '', is_shared: false });
      toast.success('Canned response added successfully');
      await loadData();
    } catch (error) {
      console.error('Error adding response:', error);
      toast.error('Failed to add response');
    } finally {
      setIsAddingResponse(false);
    }
  };

  const addResourceLink = async () => {
    if (!newLink.title || !newLink.url) {
      toast.error('Please fill in title and URL');
      return;
    }

    setIsAddingLink(true);
    try {
      const { error } = await supabase.from('resource_links').insert({
        title: newLink.title,
        url: newLink.url,
        description: newLink.description,
        category: newLink.category || 'general',
        tags: newLink.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        is_shared: newLink.is_shared,
        user_id: user?.id
      });

      if (error) throw error;

      setNewLink({ title: '', url: '', description: '', category: '', tags: '', is_shared: false });
      toast.success('Resource link added successfully');
      await loadData();
    } catch (error) {
      console.error('Error adding link:', error);
      toast.error('Failed to add link');
    } finally {
      setIsAddingLink(false);
    }
  };

  const incrementLinkAccess = async (linkId: string) => {
    try {
      // Get current count and increment
      const { data: currentData } = await supabase
        .from('resource_links')
        .select('access_count')
        .eq('id', linkId)
        .single();
      
      if (currentData) {
        await supabase
          .from('resource_links')
          .update({ access_count: (currentData.access_count || 0) + 1 })
          .eq('id', linkId);
      }
    } catch (error) {
      console.error('Error updating access count:', error);
    }
  };

  const incrementResponseUse = async (responseId: string) => {
    try {
      // Get current count and increment
      const { data: currentData } = await supabase
        .from('canned_responses')
        .select('use_count')
        .eq('id', responseId)
        .single();
      
      if (currentData) {
        await supabase
          .from('canned_responses')
          .update({ use_count: (currentData.use_count || 0) + 1 })
          .eq('id', responseId);
      }
    } catch (error) {
      console.error('Error updating use count:', error);
    }
  };

  const filteredTemplates = templates.filter(template =>
    template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredResponses = cannedResponses.filter(response =>
    response.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    response.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    response.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredLinks = resourceLinks.filter(link =>
    link.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    link.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    link.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <DashboardLayout 
        title="Tools & Templates" 
        subtitle="Improve efficiency with pre-built templates and resources"
      >
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading templates and resources...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Tools & Templates" 
      subtitle="Improve efficiency with pre-built templates and resources"
    >
      <div className="space-y-6">
        {/* Search Bar */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates, responses, and resources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs defaultValue="templates" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="templates">Policy Templates ({filteredTemplates.length})</TabsTrigger>
            <TabsTrigger value="responses">Canned Responses ({filteredResponses.length})</TabsTrigger>
            <TabsTrigger value="resources">Resource Library ({filteredLinks.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <FileText className="mr-2 h-5 w-5" />
                    Policy Templates
                  </CardTitle>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Template
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Add New Template</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="template-title">Title</Label>
                          <Input
                            id="template-title"
                            value={newTemplate.title}
                            onChange={(e) => setNewTemplate({...newTemplate, title: e.target.value})}
                            placeholder="Template title"
                          />
                        </div>
                        <div>
                          <Label htmlFor="template-category">Category</Label>
                          <Input
                            id="template-category"
                            value={newTemplate.category}
                            onChange={(e) => setNewTemplate({...newTemplate, category: e.target.value})}
                            placeholder="e.g., policy, assessment, procedure"
                          />
                        </div>
                        <div>
                          <Label htmlFor="template-description">Description</Label>
                          <Input
                            id="template-description"
                            value={newTemplate.description}
                            onChange={(e) => setNewTemplate({...newTemplate, description: e.target.value})}
                            placeholder="Brief description of this template"
                          />
                        </div>
                        <div>
                          <Label htmlFor="template-tags">Tags (comma-separated)</Label>
                          <Input
                            id="template-tags"
                            value={newTemplate.tags}
                            onChange={(e) => setNewTemplate({...newTemplate, tags: e.target.value})}
                            placeholder="NIST, CMMC, Access Control"
                          />
                        </div>
                        <div>
                          <Label htmlFor="template-content">Content</Label>
                          <Textarea
                            id="template-content"
                            value={newTemplate.content}
                            onChange={(e) => setNewTemplate({...newTemplate, content: e.target.value})}
                            placeholder="Template content..."
                            rows={10}
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="template-shared"
                            checked={newTemplate.is_shared}
                            onChange={(e) => setNewTemplate({...newTemplate, is_shared: e.target.checked})}
                          />
                          <Label htmlFor="template-shared">Share with organization</Label>
                        </div>
                        <Button onClick={addTemplate} className="w-full" disabled={isAddingTemplate}>
                          {isAddingTemplate ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            'Add Template'
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredTemplates.map((template) => (
                    <Card key={template.id} className="border">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold">{template.title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">
                                {template.category}
                              </Badge>
                              {template.is_shared && (
                                <Badge variant="secondary" className="text-xs">
                                  <Shield className="mr-1 h-3 w-3" />
                                  Shared
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(template.content)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1">
                            {template.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          {template.description && (
                            <p className="text-sm text-muted-foreground">
                              {template.description}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {template.content.substring(0, 100)}...
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="responses" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <MessageSquare className="mr-2 h-5 w-5" />
                    Canned Responses
                  </CardTitle>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Response
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Add New Canned Response</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="response-title">Title</Label>
                          <Input
                            id="response-title"
                            value={newResponse.title}
                            onChange={(e) => setNewResponse({...newResponse, title: e.target.value})}
                            placeholder="Response title"
                          />
                        </div>
                        <div>
                          <Label htmlFor="response-category">Category</Label>
                          <Input
                            id="response-category"
                            value={newResponse.category}
                            onChange={(e) => setNewResponse({...newResponse, category: e.target.value})}
                            placeholder="e.g., escalation, compliance, general"
                          />
                        </div>
                        <div>
                          <Label htmlFor="response-description">Description</Label>
                          <Input
                            id="response-description"
                            value={newResponse.description}
                            onChange={(e) => setNewResponse({...newResponse, description: e.target.value})}
                            placeholder="Brief description of this response"
                          />
                        </div>
                        <div>
                          <Label htmlFor="response-tags">Tags (comma-separated)</Label>
                          <Input
                            id="response-tags"
                            value={newResponse.tags}
                            onChange={(e) => setNewResponse({...newResponse, tags: e.target.value})}
                            placeholder="escalation, initial, NIST"
                          />
                        </div>
                        <div>
                          <Label htmlFor="response-content">Content</Label>
                          <Textarea
                            id="response-content"
                            value={newResponse.content}
                            onChange={(e) => setNewResponse({...newResponse, content: e.target.value})}
                            placeholder="Response content..."
                            rows={8}
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="response-shared"
                            checked={newResponse.is_shared}
                            onChange={(e) => setNewResponse({...newResponse, is_shared: e.target.checked})}
                          />
                          <Label htmlFor="response-shared">Share with organization</Label>
                        </div>
                        <Button onClick={addCannedResponse} className="w-full" disabled={isAddingResponse}>
                          {isAddingResponse ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            'Add Response'
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredResponses.map((response) => (
                    <Card key={response.id} className="border">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold">{response.title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">
                                {response.category}
                              </Badge>
                              {response.is_shared && (
                                <Badge variant="secondary" className="text-xs">
                                  <Shield className="mr-1 h-3 w-3" />
                                  Shared
                                </Badge>
                              )}
                              <Badge variant="secondary" className="text-xs">
                                Used: {response.use_count}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                copyToClipboard(response.content);
                                incrementResponseUse(response.id);
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1">
                            {response.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          {response.description && (
                            <p className="text-sm text-muted-foreground">
                              {response.description}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {response.content}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resources" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <BookOpen className="mr-2 h-5 w-5" />
                    Resource Library
                  </CardTitle>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Link
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Resource Link</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="link-title">Title</Label>
                          <Input
                            id="link-title"
                            value={newLink.title}
                            onChange={(e) => setNewLink({...newLink, title: e.target.value})}
                            placeholder="Resource title"
                          />
                        </div>
                        <div>
                          <Label htmlFor="link-url">URL</Label>
                          <Input
                            id="link-url"
                            value={newLink.url}
                            onChange={(e) => setNewLink({...newLink, url: e.target.value})}
                            placeholder="https://..."
                          />
                        </div>
                        <div>
                          <Label htmlFor="link-description">Description</Label>
                          <Textarea
                            id="link-description"
                            value={newLink.description}
                            onChange={(e) => setNewLink({...newLink, description: e.target.value})}
                            placeholder="Brief description of the resource"
                            rows={3}
                          />
                        </div>
                        <div>
                          <Label htmlFor="link-category">Category</Label>
                          <Input
                            id="link-category"
                            value={newLink.category}
                            onChange={(e) => setNewLink({...newLink, category: e.target.value})}
                            placeholder="e.g., standards, tools, guides"
                          />
                        </div>
                        <div>
                          <Label htmlFor="link-tags">Tags (comma-separated)</Label>
                          <Input
                            id="link-tags"
                            value={newLink.tags}
                            onChange={(e) => setNewLink({...newLink, tags: e.target.value})}
                            placeholder="NIST, standards, compliance"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="link-shared"
                            checked={newLink.is_shared}
                            onChange={(e) => setNewLink({...newLink, is_shared: e.target.checked})}
                          />
                          <Label htmlFor="link-shared">Share with organization</Label>
                        </div>
                        <Button onClick={addResourceLink} className="w-full" disabled={isAddingLink}>
                          {isAddingLink ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            'Add Link'
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredLinks.map((link) => (
                    <Card key={link.id} className="border">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold">{link.title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">
                                {link.category}
                              </Badge>
                              {link.is_shared && (
                                <Badge variant="secondary" className="text-xs">
                                  <Shield className="mr-1 h-3 w-3" />
                                  Shared
                                </Badge>
                              )}
                              <Badge variant="secondary" className="text-xs">
                                Views: {link.access_count}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              window.open(link.url, '_blank');
                              incrementLinkAccess(link.id);
                            }}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1">
                            {link.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          {link.description && (
                            <p className="text-sm text-muted-foreground mb-3">
                              {link.description}
                            </p>
                          )}
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Link className="mr-1 h-3 w-3" />
                            <span className="truncate">{link.url}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};
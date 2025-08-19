import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Search, Download, Calendar, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { sanitizePolicyContent, createSafeHtml } from '@/lib/sanitization';
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { UnifiedHeader } from '@/components/ui/unified-header';

interface Policy {
  id: string;
  title: string;
  policy_type: string;
  content: string;
  version: string;
  template_used?: string;
  metadata: any;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export default function PolicyLibrary() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadPolicies();
    }
  }, [user]);

  const loadPolicies = async () => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const url = new URL('https://xfdqnmtzuuphxivsgmua.functions.supabase.co/functions/v1/get-policies');
      
      if (selectedType !== 'all') {
        url.searchParams.set('policy_type', selectedType);
      }

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmZHFubXR6dXVwaHhpdnNnbXVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5MjE2MDksImV4cCI6MjA2OTQ5NzYwOX0.op82w015Am91OghHdNauFrQbajQzeu4E0VKY_mqt5M0'
        }
      });

      if (!response.ok) throw new Error('Failed to load policies');

      const result = await response.json();
      setPolicies(result.policies || []);
    } catch (error) {
      console.error('Error loading policies:', error);
      toast({
        title: "Error",
        description: "Failed to load policies",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportPolicy = async (policy: Policy, format: 'pdf' | 'docx') => {
    try {
      // Create a temporary HTML content for export
      const htmlContent = `
        <html>
          <head>
            <title>${policy.title}</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
              h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
              .meta { background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px; }
              .content { margin: 20px 0; }
            </style>
          </head>
          <body>
            <h1>${policy.title}</h1>
            <div class="meta">
              <p><strong>Policy Type:</strong> ${policy.policy_type}</p>
              <p><strong>Version:</strong> ${policy.version}</p>
              <p><strong>Created:</strong> ${new Date(policy.created_at).toLocaleDateString()}</p>
            </div>
            <div class="content">
              ${policy.content}
            </div>
          </body>
        </html>
      `;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${policy.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: `Policy exported as HTML file`
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Could not export policy",
        variant: "destructive"
      });
    }
  };

  // Filter policies based on search term
  const filteredPolicies = policies.filter(policy => 
    policy.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    policy.policy_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get unique policy types for filter
  const policyTypes = Array.from(new Set(policies.map(p => p.policy_type)));

  useEffect(() => {
    loadPolicies();
  }, [selectedType]);

  if (loading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen bg-gradient-background flex w-full">
          <AppSidebar />
          
          <div className="flex-1 flex flex-col">
            <UnifiedHeader context="dashboard" />
            
            <main className="flex-1 overflow-hidden">
              <div className="h-full p-6">
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-2">Loading policies...</span>
                </div>
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gradient-background flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <UnifiedHeader context="dashboard" />
          
          <main className="flex-1 overflow-hidden">
            <div className="h-full p-6">
              <div className="page">
                <div className="page-title">
                  <h1 className="text-2xl font-bold tracking-tight">Policy Library</h1>
                  <p className="text-muted-foreground">
                    View and manage your organization's saved policies
                  </p>
                </div>

                <div className="section-card">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    <h2 className="text-lg font-semibold">Policy Management</h2>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Search, filter, and export your generated compliance policies
                  </p>

                  {/* Search and Filter Controls */}
                  <div className="flex-gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search policies..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={selectedType} onValueChange={setSelectedType}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {policyTypes.map(type => (
                          <SelectItem key={type} value={type}>
                            {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Policies Grid */}
                  {filteredPolicies.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-muted-foreground mb-4 mx-auto" />
                      <h3 className="text-lg font-semibold mb-2">No policies found</h3>
                      <p className="text-muted-foreground text-center">
                        {searchTerm ? 'No policies match your search criteria.' : 'Start by generating a policy in the chat interface.'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredPolicies.map((policy) => (
                      <div key={policy.id} className="section-card-compact">
                        <div className="flex items-start justify-between mb-3">
                          <FileText className="h-5 w-5 text-primary mt-1" />
                          <Badge variant="secondary" className="text-xs">
                            {policy.policy_type.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        
                        <h3 className="text-lg font-semibold line-clamp-2 mb-2">
                          {policy.title}
                        </h3>
                        
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                          <Calendar className="h-3 w-3" />
                          {new Date(policy.created_at).toLocaleDateString()}
                          <span>v{policy.version}</span>
                        </div>
                        
                        <ScrollArea className="h-24 mb-4">
                          <div 
                            className="text-sm text-muted-foreground prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={createSafeHtml(
                              sanitizePolicyContent(policy.content.substring(0, 200) + '...'), 
                              'html'
                            )}
                          />
                        </ScrollArea>
                        
                        <Button
                          onClick={() => handleExportPolicy(policy, 'pdf')}
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </Button>
                      </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
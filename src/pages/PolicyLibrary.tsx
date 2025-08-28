// PolicyLibrary.tsx
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Search, Download, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { sanitizePolicyContent, createSafeHtml } from '@/lib/sanitization';

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
  const { toast } = useToast();

  useEffect(() => {
    if (user) loadPolicies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    loadPolicies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType]);

  async function loadPolicies() {
    try {
      setLoading(true);
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const url = new URL(
        'https://xfdqnmtzuuphxivsgmua.functions.supabase.co/functions/v1/get-policies',
      );
      if (selectedType !== 'all') url.searchParams.set('policy_type', selectedType);

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          apikey:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmZHFubXR6dXVwaHhpdnNnbXVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5MjE2MDksImV4cCI6MjA2OTQ5NzYwOX0.op82w015Am91OghHdNauFrQbajQzeu4E0VKY_mqt5M0',
        },
      });

      if (!response.ok) throw new Error('Failed to load policies');
      const result = await response.json();
      setPolicies(result.policies || []);
    } catch (error) {
      console.error('Error loading policies:', error);
      toast({
        title: 'Error',
        description: 'Failed to load policies',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleExportPolicy(policy: Policy, _format: 'pdf' | 'docx') {
    try {
      const htmlContent = `
        <html>
          <head>
            <title>${policy.title}</title>
            <meta charset="utf-8" />
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
      toast({ title: 'Export successful', description: 'Policy exported as HTML file' });
    } catch {
      toast({
        title: 'Export failed',
        description: 'Could not export policy',
        variant: 'destructive',
      });
    }
  }

  const filteredPolicies = policies.filter(
    (p) =>
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.policy_type.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const policyTypes = Array.from(new Set(policies.map((p) => p.policy_type)));

  return (
    <div className="mx-auto w-full max-w-[1040px] px-4 pb-10 pt-6 sm:px-6">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Policy Library</h1>
        <p className="text-muted-foreground">View and manage your organization's saved policies</p>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          <span className="ml-2">Loading policies...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Controls */}
          <div className="section-card">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Policy Management</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Search, filter, and export your generated compliance policies
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
                <Input
                  placeholder="Search policies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-full sm:w-56">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {policyTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {filteredPolicies.length === 0 ? (
              <div className="col-span-full py-12 text-center">
                <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">No policies found</h3>
                <p className="text-muted-foreground">
                  {searchTerm
                    ? 'No policies match your search criteria.'
                    : 'Start by generating a policy in the chat interface.'}
                </p>
              </div>
            ) : (
              filteredPolicies.map((policy) => (
                <div key={policy.id} className="section-card-compact">
                  <div className="mb-3 flex items-start justify-between">
                    <FileText className="mt-1 h-5 w-5 text-primary" />
                    <Badge variant="secondary" className="text-xs">
                      {policy.policy_type.replace(/_/g, ' ')}
                    </Badge>
                  </div>

                  <h3 className="mb-2 line-clamp-2 text-lg font-semibold">{policy.title}</h3>

                  <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(policy.created_at).toLocaleDateString()}
                    <span>v{policy.version}</span>
                  </div>

                  <ScrollArea className="mb-4 h-24">
                    <div
                      className="prose prose-sm max-w-none text-sm text-muted-foreground"
                      dangerouslySetInnerHTML={createSafeHtml(
                        sanitizePolicyContent(policy.content.substring(0, 200) + '...'),
                        'html',
                      )}
                    />
                  </ScrollArea>

                  <Button
                    onClick={() => handleExportPolicy(policy, 'pdf')}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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
import { FileText, Search, Download, Calendar, Eye } from 'lucide-react';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { createSafeHtml } from '@/lib/sanitization';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { exportPolicyToPDF, exportPolicyToDocx } from '@/lib/policyExport';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [twoColumn, setTwoColumn] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
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
      // Build functions base from current SUPABASE_URL (respects local dev)
      const base = (() => {
        try {
          const u = new URL(SUPABASE_URL);
          const isCloud = u.hostname.endsWith('.supabase.co');
          if (isCloud) {
            return `${u.protocol}//${u.hostname.replace('.supabase.co', '.functions.supabase.co')}`;
          }
          // Local/dev: functions are served under the same base URL
          return SUPABASE_URL.replace(/\/+$/, '');
        } catch {
          return SUPABASE_URL.replace(/\/+$/, '');
        }
      })();
      const url = new URL(`${base}/functions/v1/get-policies`);
      if (selectedType !== 'all') url.searchParams.set('policy_type', selectedType);

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
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

  async function handleExportPolicy(policy: Policy, format: 'pdf' | 'docx') {
    try {
      if (format === 'pdf') await exportPolicyToPDF(policy.title, policy.content);
      else await exportPolicyToDocx(policy.title, policy.content);
      toast({ title: 'Export successful', description: `Policy exported as ${format.toUpperCase()}` });
    } catch (e) {
      console.error('Export failed', e);
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

          {/* Grid: force two columns on large screens */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-2">
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
                      className="prose prose-sm max-w-none text-sm text-muted-foreground sm:prose-base prose-headings:mb-2 prose-headings:mt-4 prose-p:mb-2 prose-p:leading-relaxed prose-strong:font-semibold prose-em:italic prose-ol:mb-2 prose-ul:mb-2"
                      dangerouslySetInnerHTML={createSafeHtml(normalizePolicyMarkdown(policy.content), 'markdown')}
                    />
                  </ScrollArea>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setSelectedPolicy(policy);
                        setViewOpen(true);
                      }}
                      variant="secondary"
                      size="sm"
                      className="w-1/2"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="w-1/2">
                          <Download className="mr-2 h-4 w-4" />
                          Export
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => handleExportPolicy(policy, 'pdf')}>
                          Download PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExportPolicy(policy, 'docx')}>
                          Download Word
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* View Policy Dialog */}
      <Dialog open={viewOpen} onOpenChange={(o) => { setViewOpen(o); if (!o) { setTwoColumn(false); setFullScreen(false); } }}>
        <DialogContent className={`${fullScreen ? 'h-[92vh] max-w-[96vw]' : 'max-h-[85vh] max-w-3xl'} overflow-y-auto`}>
          <DialogHeader>
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {selectedPolicy?.title}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Button size="sm" variant={twoColumn ? 'secondary' : 'outline'} onClick={() => setTwoColumn(false)}>1 Col</Button>
                <Button size="sm" variant={twoColumn ? 'default' : 'outline'} onClick={() => setTwoColumn(true)}>2 Col</Button>
                <Button size="sm" variant={fullScreen ? 'default' : 'outline'} onClick={() => setFullScreen((v) => !v)}>{fullScreen ? 'Exit Fullscreen' : 'Fullscreen'}</Button>
              </div>
            </div>
          </DialogHeader>
          {selectedPolicy && (
            <div>
              <div className="mb-4 grid grid-cols-1 gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                <div><span className="font-medium text-foreground">Type:</span> {selectedPolicy.policy_type.replace(/_/g, ' ')}</div>
                <div><span className="font-medium text-foreground">Version:</span> v{selectedPolicy.version}</div>
                <div><span className="font-medium text-foreground">Created:</span> {new Date(selectedPolicy.created_at).toLocaleDateString()}</div>
              </div>
              <div className={`prose max-w-none ${twoColumn ? 'columns-2 gap-10' : ''} sm:prose-base prose-headings:mb-2 prose-headings:mt-4 prose-p:mb-2 prose-p:leading-relaxed prose-strong:font-semibold prose-em:italic prose-ol:mb-2 prose-ul:mb-2`}>
                <div dangerouslySetInnerHTML={createSafeHtml(normalizePolicyMarkdown(selectedPolicy.content), 'markdown')} />
              </div>
              <div className="mt-6 flex gap-3 max-sm:flex-col">
                <Button onClick={() => handleExportPolicy(selectedPolicy, 'pdf')} variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" /> Download PDF
                </Button>
                <Button onClick={() => handleExportPolicy(selectedPolicy, 'docx')} variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" /> Download Word
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Normalize policy markdown to improve formatting parity with chat
function normalizePolicyMarkdown(md: string): string {
  if (!md) return '';
  try {
    let out = md.replace(/\u0000/g, '').replace(/\r\n?/g, '\n').trim();
    // Ensure '#Heading' becomes '# Heading'
    out = out
      .split('\n')
      .map((line) => (/^#{1,6}[^#\s]/.test(line) ? line.replace(/^(#{1,6})(.*)$/, (_, h, t) => `${h} ${String(t).trim()}`) : line))
      .join('\n');
    // Ensure headings start on a new line if they were jammed inline (e.g., ".)## Heading")
    out = out.replace(/([^\n])\s*(#{1,6}\s+)/g, '$1\n\n$2');
    // Add a blank line after common heading tokens if the body starts immediately
    const headingTokens = '(Introduction|Purpose|Scope|Definitions(?:\s*\([^\)]*\))?|Policy\s+Statement|Procedures|Responsibilities|Consequences\s+of\s+Non-Compliance|References|Revision\s+History)';
    const reAfter = new RegExp(`^(#{1,6}\\s+${headingTokens})(?=\\S)`, 'gmi');
    out = out.replace(reAfter, '$1\n\n');
    // Convert lines that are only bold text to headings
    out = out
      .split('\n')
      .map((line) => {
        const m = line.match(/^\s*\*\*(.+?)\*\*\s*$/);
        return m ? `## ${m[1].trim()}` : line;
      })
      .join('\n');
    // Collapse 3+ newlines
    out = out.replace(/\n{3,}/g, '\n\n');
    return out;
  } catch {
    return md;
  }
}

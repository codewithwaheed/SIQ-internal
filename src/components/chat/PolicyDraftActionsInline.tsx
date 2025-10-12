import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Save, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { exportPolicyToPDF, exportPolicyToDocx } from '@/lib/policyExport';

interface Props {
  policyTitle: string;
  policyType?: string;
  content: string;
  messageId?: string;
}

export const PolicyDraftActionsInline: React.FC<Props> = ({ policyTitle, policyType, content, messageId }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = async () => {
    if (!content || isSaved) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.functions.invoke('save-policy', {
        body: {
          title: policyTitle,
          policyType: policyType,
          content,
          templateUsed: policyType,
          metadata: { messageId, savedAt: new Date().toISOString() },
        },
      });
      if (error) throw error;
      setIsSaved(true);
      toast({ title: 'Policy saved', description: 'View it in Policies. A PDF download is ready.' });
    } catch (e) {
      toast({ title: 'Save failed', description: 'Could not save policy', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'docx') => {
    try {
      if (format === 'pdf') await exportPolicyToPDF(policyTitle, content);
      else await exportPolicyToDocx(policyTitle, content);
      toast({ title: 'Export successful', description: `Policy exported as ${format.toUpperCase()} document` });
    } catch (e) {
      toast({ title: 'Export failed', description: 'Could not export policy', variant: 'destructive' });
    }
  };

  return (
    <div className="mt-3 flex flex-wrap gap-3">
      <Button onClick={handleSave} disabled={isSaving || isSaved} size="sm">
        {isSaving ? 'Saving…' : isSaved ? (<><CheckCircle className="mr-1 h-4 w-4" /> Saved</>) : (<><Save className="mr-1 h-4 w-4" /> Save Policy</>)}
      </Button>
      <Button onClick={() => handleExport('pdf')} variant="outline" size="sm">
        <Download className="mr-1 h-4 w-4" /> Download PDF
      </Button>
      <Button onClick={() => handleExport('docx')} variant="outline" size="sm">
        <Download className="mr-1 h-4 w-4" /> Download Word
      </Button>
    </div>
  );
};

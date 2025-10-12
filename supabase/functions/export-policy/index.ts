import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExportRequest {
  messageId: string;
  format: 'pdf' | 'docx';
  policyType: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      },
    );

    // Get user from auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: user, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { messageId, format, policyType } = (await req.json()) as ExportRequest;

    if (!messageId || !format || !policyType) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For now, we'll generate a sample policy content
    // In a real implementation, you'd fetch the actual policy content from the database
    const samplePolicyContent = `# ${policyType.replace('_', ' ').toUpperCase()} POLICY

**Introduction**
This policy establishes the framework for managing ${policyType.replace('_', ' ')} within our organization.

**Purpose**
The purpose of this policy is to ensure proper ${policyType.replace('_', ' ')} practices are followed.

**Scope**
This policy applies to all employees, contractors, and third parties who have access to company resources.

**Definitions**
- **Policy**: A formal statement of principles and guidelines
- **Compliance**: Adherence to established rules and regulations

**Policy Statement**
All users must comply with the requirements outlined in this policy.

**Procedures**
1. Review policy requirements
2. Implement necessary controls
3. Monitor compliance

**Responsibilities**
- Management: Ensure policy implementation
- Employees: Follow policy guidelines
- IT Department: Maintain technical controls

**Consequences of Non-Compliance**
Violations may result in disciplinary action up to and including termination.

**References**
- Industry best practices
- Regulatory requirements

**Revision History**
| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0 | ${new Date().toISOString().split('T')[0]} | SentrIQ AI | Initial |`;

    if (format === 'pdf') {
      // Render markdown to HTML (client will convert to PDF if needed)
      const markedRes = await fetch('https://cdn.skypack.dev/marked@12?min');
      const markedCode = await markedRes.text();
      // Lightweight inline renderer: avoid eval; fallback to simple replacement if blocked
      const htmlBody = (() => {
        try {
          // eslint-disable-next-line no-new-func
          const f = new Function(`${markedCode}; return marked.parse(arguments[0]);`);
          return String(f(samplePolicyContent));
        } catch {
          return samplePolicyContent
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/\n/g, '<br>');
        }
      })();
      const htmlContent = `<!doctype html><html><head><meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
          h1 { border-bottom: 2px solid #333; padding-bottom: 10px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 6px; }
        </style></head><body>${htmlBody}</body></html>`;

      // Generate filename
      const date = new Date().toISOString().split('T')[0];
      const filename = `${policyType}_${date}.pdf`;

      // For now, return the HTML content as a simple PDF simulation
      return new Response(htmlContent, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    } else if (format === 'docx') {
      // For DOCX generation, we'll return a simple Word document (placeholder)
      const date = new Date().toISOString().split('T')[0];
      const filename = `${policyType}_${date}.docx`;

      // Simple DOCX content (this is a placeholder - in production you'd use the docx library)
      const docxContent = `Policy Document: ${policyType}\n\n${samplePolicyContent}`;

      return new Response(docxContent, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid format' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Export error:', error);
    return new Response(JSON.stringify({ error: 'Export failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

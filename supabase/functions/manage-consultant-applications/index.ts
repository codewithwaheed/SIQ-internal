import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'No authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Verify user is authenticated and is admin
  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  );

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Check if user is admin
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (roleError || roleData?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    if (req.method === 'GET') {
      // Get all applications
      const { data: applications, error } = await supabase
        .from('consultant_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify(applications), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (req.method === 'PATCH') {
      // Update application status
      const { applicationId, status, adminNotes } = await req.json();

      console.log('Updating application:', applicationId, 'to status:', status);

      const updateData: any = {
        status,
        admin_notes: adminNotes,
        updated_at: new Date().toISOString()
      };

      if (status === 'approved') {
        updateData.approved_by = user.id;
        updateData.approved_at = new Date().toISOString();
      }

      const { data: application, error: updateError } = await supabase
        .from('consultant_applications')
        .update(updateData)
        .eq('id', applicationId)
        .select()
        .single();

      if (updateError) throw updateError;

      console.log('Application updated successfully');

      // Send email notification
      if (resend && application) {
        try {
          let emailSubject = '';
          let emailContent = '';

          if (status === 'approved') {
            emailSubject = 'Welcome to SentrIQ - Application Approved!';
            emailContent = `
              <h1>Congratulations, ${application.full_name}!</h1>
              <p>We're excited to inform you that your consultant application has been approved.</p>
              <p>Welcome to the SentrIQ expert network!</p>
              <p>Next steps:</p>
              <ul>
                <li>You can now log in to your consultant dashboard</li>
                <li>Complete your profile setup</li>
                <li>Start receiving consultation requests</li>
              </ul>
              <p>If you have any questions, please don't hesitate to reach out.</p>
              <br>
              <p>Best regards,<br>The SentrIQ Team</p>
            `;
          } else if (status === 'rejected') {
            emailSubject = 'SentrIQ Consultant Application Update';
            emailContent = `
              <h1>Thank you for your interest, ${application.full_name}</h1>
              <p>Thank you for taking the time to apply to join the SentrIQ expert network.</p>
              <p>After careful review, we've decided not to move forward with your application at this time.</p>
              <p>We encourage you to continue building your expertise and consider applying again in the future.</p>
              <br>
              <p>Best regards,<br>The SentrIQ Team</p>
            `;
          }

          if (emailSubject && emailContent) {
            await resend.emails.send({
              from: 'SentrIQ <noreply@sentriq.com>',
              to: [application.email],
              subject: emailSubject,
              html: emailContent,
            });
            console.log('Status notification email sent successfully');
          }

        } catch (emailError) {
          console.error('Email error:', emailError);
          // Don't fail the request if email fails
        }
      }

      return new Response(JSON.stringify(application), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error managing application:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to manage application',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
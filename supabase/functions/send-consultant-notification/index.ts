import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'npm:resend@2.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationRequest {
  escalationId: string;
  consultantId: string;
  userEmail: string;
  escalationReason: string;
  priority: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    const { escalationId, consultantId, userEmail, escalationReason, priority }: NotificationRequest = await req.json();

    // Get consultant details
    const { data: consultant, error: consultantError } = await supabase
      .from('consultant_profiles')
      .select(`
        user_id,
        profiles!inner(email, first_name, last_name)
      `)
      .eq('user_id', consultantId)
      .single();

    if (consultantError || !consultant) {
      throw new Error('Consultant not found');
    }

    const consultantEmail = consultant.profiles.email;
    const consultantName = `${consultant.profiles.first_name} ${consultant.profiles.last_name}`.trim();

    // Send email notification
    const emailResponse = await resend.emails.send({
      from: 'CyberSec Platform <notifications@yourdomain.com>',
      to: [consultantEmail],
      subject: `🚨 New ${priority.toUpperCase()} Priority Escalation Assigned`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Escalation Assignment</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">🛡️ CyberSec Platform</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">New Escalation Assignment</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
            <p style="margin-top: 0;">Hi ${consultantName},</p>
            
            <p>You have been assigned a new escalation that requires your expertise:</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid ${priority === 'urgent' ? '#dc3545' : priority === 'high' ? '#fd7e14' : '#28a745'}; margin: 20px 0;">
              <h3 style="margin-top: 0; color: ${priority === 'urgent' ? '#dc3545' : priority === 'high' ? '#fd7e14' : '#28a745'};">
                ${priority.toUpperCase()} Priority Escalation
              </h3>
              <p><strong>From:</strong> ${userEmail}</p>
              <p><strong>Reason:</strong> ${escalationReason}</p>
              <p><strong>Escalation ID:</strong> #${escalationId.slice(0, 8)}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${Deno.env.get('SUPABASE_URL')?.replace('//', '//').split('/')[0] + '//'+ Deno.env.get('SUPABASE_URL')?.replace('//', '//').split('/')[2]}/consultant-dashboard" 
                 style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                🚀 View Escalation
              </a>
            </div>
            
            <div style="background: #e7f3ff; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px;"><strong>💡 Quick Tips:</strong></p>
              <ul style="margin: 5px 0; font-size: 14px; padding-left: 20px;">
                <li>Review the conversation history to understand context</li>
                <li>Provide clear, actionable guidance</li>
                <li>Escalate internally if needed for complex issues</li>
                <li>Close the escalation when resolved</li>
              </ul>
            </div>
            
            <p style="margin-bottom: 0; font-size: 14px; color: #666;">
              This notification was sent because you are assigned to handle cybersecurity escalations. 
              If you have any issues accessing the platform, please contact support.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
            <p>CyberSec Platform - Securing businesses with AI + Human expertise</p>
          </div>
        </body>
        </html>
      `,
    });

    if (emailResponse.error) {
      throw emailResponse.error;
    }

    // Create in-app notification
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: consultantId,
        title: `New ${priority} priority escalation assigned`,
        message: `Escalation from ${userEmail}: ${escalationReason}`,
        notification_type: 'escalation_assigned',
        priority: priority,
        escalation_id: escalationId,
        metadata: {
          escalation_id: escalationId,
          user_email: userEmail,
          email_sent: true,
          email_id: emailResponse.data?.id
        }
      });

    if (notificationError) {
      console.error('Failed to create in-app notification:', notificationError);
    }

    // Log the notification for admin tracking
    const { error: logError } = await supabase
      .from('audit_logs')
      .insert({
        action: 'CONSULTANT_NOTIFICATION_SENT',
        description: `Email notification sent to consultant for escalation ${escalationId}`,
        user_id: consultantId,
        metadata: {
          escalation_id: escalationId,
          consultant_email: consultantEmail,
          email_id: emailResponse.data?.id,
          priority: priority,
          timestamp: new Date().toISOString()
        }
      });

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResponse.data?.id,
      message: 'Notification sent successfully' 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error sending consultant notification:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to send notification',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
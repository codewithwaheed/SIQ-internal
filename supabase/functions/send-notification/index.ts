import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'npm:resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  type: string;
  escalation_id?: string;
  consultant_email?: string;
  client_name?: string;
  priority?: string;
}

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const getEmailTemplate = (notification: NotificationRequest) => {
  switch (notification.type) {
    case 'new_escalation':
      return {
        subject: 'New Escalation Submitted',
        html: `
          <h2>New Escalation Received</h2>
          <p>A new escalation has been submitted${notification.client_name ? ` by ${notification.client_name}` : ''}.</p>
          <p><strong>Priority:</strong> ${notification.priority || 'Normal'}</p>
          ${notification.escalation_id ? `<p><strong>Escalation ID:</strong> ${notification.escalation_id}</p>` : ''}
        `,
      };

    case 'follow_up':
      return {
        subject: 'Follow-up Required',
        html: `
          <h2>Follow-up Required</h2>
          <p>A follow-up is required for escalation ${notification.escalation_id}.</p>
        `,
      };

    case 'feedback':
      return {
        subject: 'Client Feedback Received',
        html: `
          <h2>Feedback Received</h2>
          <p>Client feedback has been received for escalation ${notification.escalation_id}.</p>
        `,
      };

    default:
      return {
        subject: 'Notification',
        html: '<p>You have a new notification.</p>',
      };
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const notification: NotificationRequest = await req.json();
    console.log('Processing notification:', notification);

    const { subject, html } = getEmailTemplate(notification);

    if (notification.consultant_email) {
      const { data, error } = await resend.emails.send({
        from: 'CyberGuard <noreply@cyberguard.com>',
        to: [notification.consultant_email],
        subject,
        html,
      });

      if (error) {
        console.error('Error sending email:', error);
        throw error;
      }

      console.log('Email sent successfully:', data?.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Notification sent successfully',
        email_id: notification.consultant_email ? 'sent' : 'skipped',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error: any) {
    console.error('Error in send-notification function:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { Resend } from 'npm:resend@2.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  escalationId: string;
  userEmail: string;
  userName: string;
  summary: string;
  priority: string;
  estimatedResponseTime: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      escalationId,
      userEmail,
      userName,
      summary,
      priority,
      estimatedResponseTime,
    }: NotificationRequest = await req.json();

    console.log('Sending escalation notification to:', userEmail);

    // Send confirmation email to user
    const emailResponse = await resend.emails.send({
      from: 'CyberSec Experts <noreply@yourdomain.com>',
      to: [userEmail],
      subject: 'Your Cybersecurity Expert Request Has Been Submitted',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Expert Request Confirmation</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0; font-size: 24px;">🛡️ CyberSec Experts</h1>
          </div>

          <div style="background: #f8fafc; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <h2 style="color: #1e293b; margin: 0 0 16px 0; font-size: 20px;">Request Submitted Successfully</h2>
            <p style="margin: 0; color: #475569;">Hi ${userName}, we've received your cybersecurity expert request and our team is reviewing it.</p>
          </div>

          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <h3 style="color: #1e293b; margin: 0 0 12px 0; font-size: 16px;">Request Details</h3>
            <p style="margin: 0 0 8px 0;"><strong>Request ID:</strong> ${escalationId}</p>
            <p style="margin: 0 0 8px 0;"><strong>Priority:</strong> <span style="text-transform: capitalize; color: ${priority === 'high' ? '#dc2626' : priority === 'medium' ? '#d97706' : '#059669'};">${priority}</span></p>
            <p style="margin: 0 0 12px 0;"><strong>Summary:</strong></p>
            <p style="margin: 0; background: #f1f5f9; padding: 12px; border-radius: 4px; font-style: italic;">"${summary}"</p>
          </div>

          <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <h3 style="color: #065f46; margin: 0 0 8px 0; font-size: 16px;">⏱️ What Happens Next?</h3>
            <p style="margin: 0 0 8px 0; color: #047857;">• A cybersecurity expert will review your request</p>
            <p style="margin: 0 0 8px 0; color: #047857;">• You'll receive a detailed response within <strong>${estimatedResponseTime}</strong></p>
            <p style="margin: 0; color: #047857;">• All communication will be sent to this email address</p>
          </div>

          <div style="text-align: center; margin-bottom: 24px;">
            <p style="margin: 0 0 16px 0; color: #64748b;">Need to make changes to your request?</p>
            <a href="#" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">View Your Request</a>
          </div>

          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">
            <p style="margin: 0; color: #64748b; font-size: 14px;">
              This email was sent to ${userEmail}. If you didn't request cybersecurity consultation, please ignore this email.
            </p>
          </div>

        </body>
        </html>
      `,
    });

    if (emailResponse.error) {
      throw new Error(`Failed to send email: ${emailResponse.error.message}`);
    }

    console.log('Email sent successfully:', emailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        emailId: emailResponse.data?.id,
        message: 'Notification email sent successfully',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      },
    );
  } catch (error: any) {
    console.error('Error in send-escalation-notification function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      },
    );
  }
});

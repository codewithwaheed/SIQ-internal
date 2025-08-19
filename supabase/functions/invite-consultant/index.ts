import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  email: string;
  firstName: string;
  lastName: string;
  expertise: string[];
  message?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    // Verify admin access
    const authHeader = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!userRole) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Admin access required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { email, firstName, lastName, expertise, message }: InviteRequest =
      await req.json();

    // Create invite token
    const inviteToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Create invite record
    const { data: invite, error: inviteError } = await supabase
      .from("invites")
      .insert({
        email,
        token: inviteToken,
        role: "consultant",
        expires_at: expiresAt.toISOString(),
        created_by: user.id,
      })
      .select()
      .single();

    if (inviteError) {
      throw new Error("Failed to create invite: " + inviteError.message);
    }

    // Send invitation email
    const inviteUrl = `${Deno.env.get("SITE_URL") || "http://localhost:3000"}/auth?invite=${inviteToken}`;

    const emailResponse = await resend.emails.send({
      from: "CyberSec Platform <invites@yourdomain.com>",
      to: [email],
      subject: "🛡️ Invitation to Join CyberSec Platform as a Consultant",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Consultant Invitation</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">🛡️ CyberSec Platform</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">Consultant Invitation</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
            <p style="margin-top: 0; font-size: 18px;">Hi ${firstName},</p>
            
            <p>We're excited to invite you to join the CyberSec Platform as a cybersecurity consultant! 🎉</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #28a745;">About Your Role</h3>
              <p>As a consultant, you'll:</p>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>🤖 <strong>Support AI-powered conversations:</strong> Step in when our AI needs human expertise</li>
                <li>💬 <strong>Handle escalations:</strong> Provide expert guidance to users with complex security questions</li>
                <li>📊 <strong>Access consultant dashboard:</strong> Manage your assignments and track progress</li>
                <li>🔔 <strong>Real-time notifications:</strong> Get instant alerts for new escalations</li>
              </ul>
              
              ${
                expertise.length > 0
                  ? `
              <div style="margin-top: 15px;">
                <strong>Your Expertise Areas:</strong>
                <div style="margin-top: 5px;">
                  ${expertise.map((area) => `<span style="background: #e7f3ff; color: #0066cc; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-right: 5px; display: inline-block;">${area}</span>`).join("")}
                </div>
              </div>
              `
                  : ""
              }
            </div>
            
            ${
              message
                ? `
            <div style="background: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <p style="margin: 0;"><strong>Personal Message:</strong></p>
              <p style="margin: 5px 0 0 0; font-style: italic;">"${message}"</p>
            </div>
            `
                : ""
            }
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}" 
                 style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block;">
                🚀 Accept Invitation
              </a>
            </div>
            
            <div style="background: #e7f3ff; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px;"><strong>🔐 What happens next?</strong></p>
              <ol style="margin: 5px 0; font-size: 14px; padding-left: 20px;">
                <li>Click the "Accept Invitation" button above</li>
                <li>Create your account with a secure password</li>
                <li>Complete your consultant profile</li>
                <li>Start receiving escalations based on your expertise</li>
              </ol>
            </div>
            
            <div style="background: #fff2f2; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #ffe6e6;">
              <p style="margin: 0; font-size: 14px; color: #d63384;">
                <strong>⏰ Important:</strong> This invitation expires in 7 days. 
                Please accept it soon to secure your consultant access.
              </p>
            </div>
            
            <p style="margin-bottom: 0; font-size: 14px; color: #666;">
              If you have any questions about this invitation or the platform, 
              please don't hesitate to reach out to our team.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
            <p>CyberSec Platform - Securing businesses with AI + Human expertise</p>
            <p>This invitation was sent by an administrator. If you received this by mistake, please ignore this email.</p>
          </div>
        </body>
        </html>
      `,
    });

    if (emailResponse.error) {
      throw emailResponse.error;
    }

    // Log the invitation
    const { error: logError } = await supabase.from("audit_logs").insert({
      action: "CONSULTANT_INVITED",
      description: `Consultant invitation sent to ${email}`,
      user_id: user.id,
      metadata: {
        invited_email: email,
        invited_name: `${firstName} ${lastName}`,
        expertise_areas: expertise,
        invite_token: inviteToken,
        expires_at: expiresAt.toISOString(),
        email_id: emailResponse.data?.id,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        inviteId: invite.id,
        emailId: emailResponse.data?.id,
        expiresAt: expiresAt.toISOString(),
        message: "Invitation sent successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error sending consultant invitation:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to send invitation",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ConsultantApplication {
  fullName: string;
  email: string;
  phone?: string;
  linkedin?: string;
  experienceYears: string;
  expertiseAreas: string[];
  certifications: string[];
  otherExpertise?: string;
  otherCertifications?: string;
  smbExperience: boolean;
  vcisoExperience: boolean;
  timezone: string;
  availabilityHours: string;
  workAuthorization?: string;
  securityClearance?: string;
  engagementPreferences: string[];
  resumeUrl?: string;
  portfolioUrl?: string;
  testimonials?: string;
  backgroundCheckConsent: boolean;
  ndaAgreement: boolean;
  additionalInfo?: string;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const applicationData: ConsultantApplication = await req.json();

    console.log("Submitting consultant application:", applicationData.email);

    // Insert application into database
    const { data: application, error: dbError } = await supabase
      .from("consultant_applications")
      .insert({
        full_name: applicationData.fullName,
        email: applicationData.email,
        phone: applicationData.phone,
        linkedin: applicationData.linkedin,
        experience_years: applicationData.experienceYears,
        expertise_areas: applicationData.expertiseAreas,
        certifications: applicationData.certifications,
        other_expertise: applicationData.otherExpertise,
        other_certifications: applicationData.otherCertifications,
        smb_experience: applicationData.smbExperience,
        vciso_experience: applicationData.vcisoExperience,
        timezone: applicationData.timezone,
        availability_hours: applicationData.availabilityHours,
        work_authorization: applicationData.workAuthorization,
        security_clearance: applicationData.securityClearance,
        engagement_preferences: applicationData.engagementPreferences,
        resume_url: applicationData.resumeUrl,
        portfolio_url: applicationData.portfolioUrl,
        testimonials: applicationData.testimonials,
        background_check_consent: applicationData.backgroundCheckConsent,
        nda_agreement: applicationData.ndaAgreement,
        additional_info: applicationData.additionalInfo,
        status: "pending",
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log("Application saved successfully:", application.id);

    // Send confirmation email to applicant
    if (resend) {
      try {
        await resend.emails.send({
          from: "SentrIQ <noreply@sentriq.com>",
          to: [applicationData.email],
          subject: "SentrIQ Consultant Application Received",
          html: `
            <h1>Thank you for your application, ${applicationData.fullName}!</h1>
            <p>We have received your consultant application and will review it carefully.</p>
            <p>Our team will get back to you within 3-5 business days regarding the status of your application.</p>
            <p>If you have any questions in the meantime, please don't hesitate to reach out.</p>
            <br>
            <p>Best regards,<br>The SentrIQ Team</p>
          `,
        });
        console.log("Confirmation email sent successfully");
      } catch (emailError) {
        console.error("Email error:", emailError);
        // Don't fail the request if email fails
      }
    }

    // Send notification email to admins
    if (resend) {
      try {
        await resend.emails.send({
          from: "SentrIQ <noreply@sentriq.com>",
          to: ["eric@sentriq.io"],
          subject: "New Consultant Application Submitted",
          html: `
            <h1>New Consultant Application</h1>
            <p><strong>Name:</strong> ${applicationData.fullName}</p>
            <p><strong>Email:</strong> ${applicationData.email}</p>
            <p><strong>Experience:</strong> ${applicationData.experienceYears} years</p>
            <p><strong>Expertise:</strong> ${applicationData.expertiseAreas.join(", ")}</p>
            <p><strong>Timezone:</strong> ${applicationData.timezone}</p>
            <p><strong>Availability:</strong> ${applicationData.availabilityHours}</p>
            <br>
            <p>Please review the application in the admin dashboard.</p>
          `,
        });
        console.log("Admin notification email sent successfully");
      } catch (emailError) {
        console.error("Admin notification email error:", emailError);
        // Don't fail the request if email fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        applicationId: application.id,
        message: "Application submitted successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error submitting application:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to submit application",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

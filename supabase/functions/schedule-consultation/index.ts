import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MeetingRequest {
  escalation_id?: string;
  consultant_id?: string;
  user_id: string;
  meeting_type: 'video' | 'audio' | 'screen_share';
  scheduled_at: string;
  duration_minutes: number;
  timezone: string;
  agenda?: string;
  preparation_notes?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get the authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user?.email) {
      throw new Error("User not authenticated");
    }

    const meetingRequest: MeetingRequest = await req.json();

    console.log(`[SCHEDULE-CONSULTATION] Scheduling meeting for user ${user.id}`);

    // Generate a unique meeting URL (in a real implementation, this would integrate with Zoom, Teams, etc.)
    const meetingUrl = `https://meet.company.com/room/${crypto.randomUUID()}`;

    // Insert meeting record
    const { data: meeting, error: meetingError } = await supabaseClient
      .from('consultations')
      .insert({
        escalation_id: meetingRequest.escalation_id,
        consultant_id: meetingRequest.consultant_id,
        user_id: meetingRequest.user_id,
        meeting_type: meetingRequest.meeting_type,
        scheduled_at: meetingRequest.scheduled_at,
        duration_minutes: meetingRequest.duration_minutes,
        timezone: meetingRequest.timezone,
        agenda: meetingRequest.agenda,
        preparation_notes: meetingRequest.preparation_notes,
        meeting_url: meetingUrl,
        status: 'scheduled'
      })
      .select()
      .single();

    if (meetingError) {
      throw new Error(`Failed to create meeting: ${meetingError.message}`);
    }

    // Update escalation if provided
    if (meetingRequest.escalation_id) {
      await supabaseClient
        .from('escalations')
        .update({
          status: 'scheduled_meeting',
          updated_at: new Date().toISOString()
        })
        .eq('id', meetingRequest.escalation_id);
    }

    // Get user profile for notification
    const { data: userProfile } = await supabaseClient
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('user_id', user.id)
      .single();

    // Send confirmation email
    try {
      await supabaseClient.functions.invoke('send-notification', {
        body: {
          type: 'meeting_scheduled',
          user_email: user.email,
          user_name: userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : user.email,
          meeting_details: {
            scheduled_at: meetingRequest.scheduled_at,
            duration: meetingRequest.duration_minutes,
            type: meetingRequest.meeting_type,
            meeting_url: meetingUrl,
            agenda: meetingRequest.agenda
          }
        }
      });
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't fail the meeting creation if email fails
    }

    console.log(`[SCHEDULE-CONSULTATION] Meeting scheduled successfully: ${meeting.id}`);

    return new Response(JSON.stringify({
      success: true,
      meeting: {
        id: meeting.id,
        scheduled_at: meeting.scheduled_at,
        duration_minutes: meeting.duration_minutes,
        meeting_type: meeting.meeting_type,
        meeting_url: meeting.meeting_url,
        status: meeting.status
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in schedule-consultation function:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
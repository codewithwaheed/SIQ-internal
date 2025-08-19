import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authenticateRequest, checkRateLimit, extractIPAddress } from '../_shared/auth-middleware.ts';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface ConsultantProfileData {
  bio?: string;
  expertise_areas?: string[];
  certifications?: string[];
  years_experience?: number;
  hourly_rate?: number;
  availability_status?: 'online' | 'offline' | 'busy' | 'away';
  timezone?: string;
  availability_hours?: Record<string, any>;
  specializations?: string[];
  security_clearance?: string;
  work_authorization?: string;
  languages?: string[];
  portfolio_url?: string;
  linkedin_url?: string;
  resume_url?: string;
  is_active?: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`Processing ${req.method} request for consultant management`);
    
    // Extract IP address for rate limiting
    const ipAddress = extractIPAddress(req);
    console.log('Client IP:', ipAddress);

    // Authenticate the request
    const authResult = await authenticateRequest(req, supabase);
    console.log('Authentication result:', {
      userId: authResult.userId,
      userRole: authResult.userRole,
      orgId: authResult.orgId
    });

    // Rate limiting - use IP address instead of user ID for network requests
    const rateLimitResult = await checkRateLimit(
      supabase,
      ipAddress || 'unknown',
      authResult.userRole,
      'consultant-management',
      { maxAttempts: 20, windowMs: 60 * 1000 } // 20 requests per minute
    );

    if (!rateLimitResult.allowed) {
      console.warn('Rate limit exceeded:', rateLimitResult);
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded for consultant management',
          details: {
            remainingRequests: rateLimitResult.remainingRequests,
            resetTime: rateLimitResult.resetTime.toISOString()
          }
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': rateLimitResult.remainingRequests.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetTime.toISOString()
          }
        }
      );
    }

    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    
    // Handle different HTTP methods and routes
    switch (req.method) {
      case 'GET':
        return await handleGetRequest(url, authResult);
      case 'POST':
        return await handlePostRequest(req, authResult);
      case 'PUT':
        return await handlePutRequest(req, url, authResult);
      case 'DELETE':
        return await handleDeleteRequest(url, authResult);
      default:
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { 
            status: 405, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
    }

  } catch (error: any) {
    console.error('Error in consultant management:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// GET handlers
async function handleGetRequest(url: URL, authResult: any) {
  const searchParams = url.searchParams;
  const action = searchParams.get('action');
  const consultantId = searchParams.get('id');

  switch (action) {
    case 'list':
      return await listConsultants(searchParams, authResult);
    case 'profile':
      return await getConsultantProfile(consultantId, authResult);
    case 'available':
      return await getAvailableConsultants(searchParams, authResult);
    case 'stats':
      return await getConsultantStats(consultantId, authResult);
    default:
      return await listConsultants(searchParams, authResult);
  }
}

// List all consultants (admin/consultant access)
async function listConsultants(searchParams: URLSearchParams, authResult: any) {
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const expertise = searchParams.get('expertise') || '';
  
  const offset = (page - 1) * limit;

  let query = supabase
    .from('consultant_profiles')
    .select(`
      id,
      user_id,
      bio,
      expertise_areas,
      certifications,
      years_experience,
      availability_status,
      timezone,
      rating,
      total_escalations_handled,
      avg_response_time_hours,
      success_rate,
      client_feedback_score,
      last_active_at,
      is_verified,
      is_active,
      created_at,
      profiles!inner(
        email,
        first_name,
        last_name,
        company_name
      )
    `)
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false });

  // Apply filters
  if (status) {
    query = query.eq('availability_status', status);
  }

  if (search) {
    // This is a simplified search - in production you might want more sophisticated text search
    query = query.or(`bio.ilike.%${search}%,expertise_areas.cs.{${search}}`);
  }

  // Role-based filtering and data protection
  if (authResult.userRole === 'business_owner') {
    // Business owners can only see active, verified consultants with limited info
    query = query
      .eq('is_active', true)
      .eq('is_verified', true)
      .select(`
        id,
        user_id,
        bio,
        expertise_areas,
        years_experience,
        availability_status,
        timezone,
        rating,
        total_escalations_handled,
        avg_response_time_hours,
        success_rate,
        client_feedback_score,
        is_verified,
        is_active,
        created_at,
        profiles!inner(
          first_name,
          last_name
        )
      `);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching consultants:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch consultants', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      consultants: data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Get available consultants for assignment
async function getAvailableConsultants(searchParams: URLSearchParams, authResult: any) {
  const expertiseFilter = searchParams.get('expertise')?.split(',') || null;
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 20);

  const { data, error } = await supabase.rpc('get_available_consultants', {
    expertise_filter: expertiseFilter,
    limit_val: limit
  });

  if (error) {
    console.error('Error getting available consultants:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get available consultants', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ consultants: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Get consultant profile
async function getConsultantProfile(consultantId: string | null, authResult: any) {
  if (!consultantId) {
    return new Response(
      JSON.stringify({ error: 'Consultant ID is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { data, error } = await supabase
    .from('consultant_profiles')
    .select(`
      *,
      profiles!inner(
        email,
        first_name,
        last_name,
        company_name,
        phone,
        country
      )
    `)
    .eq('id', consultantId)
    .single();

  if (error) {
    console.error('Error fetching consultant profile:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch consultant profile', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!data) {
    return new Response(
      JSON.stringify({ error: 'Consultant not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Filter sensitive data for business owners
  if (authResult.userRole === 'business_owner') {
    const { hourly_rate, resume_url, ...filteredData } = data;
    return new Response(
      JSON.stringify({ consultant: filteredData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ consultant: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Get consultant stats
async function getConsultantStats(consultantId: string | null, authResult: any) {
  if (!consultantId) {
    return new Response(
      JSON.stringify({ error: 'Consultant ID is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Only allow consultant to see their own stats or admin to see any
  const { data: consultant } = await supabase
    .from('consultant_profiles')
    .select('user_id')
    .eq('id', consultantId)
    .single();

  if (!consultant) {
    return new Response(
      JSON.stringify({ error: 'Consultant not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (authResult.userRole !== 'admin' && consultant.user_id !== authResult.userId) {
    return new Response(
      JSON.stringify({ error: 'Access denied: Can only view own stats' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get consultant statistics
  const { data: stats, error } = await supabase
    .from('escalation_metrics')
    .select(`
      resolution_time,
      first_response_time,
      user_satisfaction_rating,
      complexity_score,
      reopened_count
    `)
    .eq('escalation_id', 'IN', 
      supabase
        .from('escalations')
        .select('id')
        .eq('assigned_consultant', consultant.user_id)
    );

  if (error) {
    console.error('Error fetching consultant stats:', error);
  }

  return new Response(
    JSON.stringify({ 
      stats: stats || [],
      consultant_id: consultantId 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// POST handler - Create consultant profile
async function handlePostRequest(req: Request, authResult: any) {
  // Only admins can create consultant profiles
  if (authResult.userRole !== 'admin') {
    return new Response(
      JSON.stringify({ error: 'Access denied: Admin role required' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const body = await req.json();
  const { user_id, application_id, ...profileData } = body;

  if (application_id) {
    // Create from application
    const { data, error } = await supabase.rpc('create_consultant_from_application', {
      application_id,
      admin_user_id: authResult.userId
    });

    if (error) {
      console.error('Error creating consultant from application:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to create consultant from application', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ consultant_profile_id: data, message: 'Consultant profile created successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!user_id) {
    return new Response(
      JSON.stringify({ error: 'user_id or application_id is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Create consultant profile directly
  const { data, error } = await supabase
    .from('consultant_profiles')
    .insert({
      user_id,
      ...profileData
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating consultant profile:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create consultant profile', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ consultant: data, message: 'Consultant profile created successfully' }),
    { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// PUT handler - Update consultant profile or availability
async function handlePutRequest(req: Request, url: URL, authResult: any) {
  const searchParams = url.searchParams;
  const action = searchParams.get('action');
  const consultantId = searchParams.get('id');

  if (!consultantId) {
    return new Response(
      JSON.stringify({ error: 'Consultant ID is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const body = await req.json();

  switch (action) {
    case 'availability':
      return await updateAvailability(consultantId, body, authResult);
    case 'profile':
    default:
      return await updateProfile(consultantId, body, authResult);
  }
}

// Update consultant availability
async function updateAvailability(consultantId: string, body: any, authResult: any) {
  const { status } = body;

  if (!status || !['online', 'offline', 'busy', 'away'].includes(status)) {
    return new Response(
      JSON.stringify({ error: 'Valid availability status is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get consultant user_id
  const { data: consultant } = await supabase
    .from('consultant_profiles')
    .select('user_id')
    .eq('id', consultantId)
    .single();

  if (!consultant) {
    return new Response(
      JSON.stringify({ error: 'Consultant not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Use the database function to update availability
  const { data, error } = await supabase.rpc('update_consultant_availability', {
    consultant_user_id: consultant.user_id,
    new_status: status
  });

  if (error) {
    console.error('Error updating consultant availability:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update availability', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, message: 'Availability updated successfully' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Update consultant profile
async function updateProfile(consultantId: string, profileData: ConsultantProfileData, authResult: any) {
  // Get consultant to check permissions
  const { data: consultant } = await supabase
    .from('consultant_profiles')
    .select('user_id')
    .eq('id', consultantId)
    .single();

  if (!consultant) {
    return new Response(
      JSON.stringify({ error: 'Consultant not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Enhanced authorization check
  const isOwnProfile = consultant.user_id === authResult.userId;
  const isAdmin = authResult.userRole === 'admin';
  const isConsultant = authResult.userRole === 'consultant';
  
  if (!isAdmin && (!isConsultant || !isOwnProfile)) {
    return new Response(
      JSON.stringify({ 
        error: 'Access denied: Insufficient permissions to update this profile',
        details: 'Only the consultant themselves or an admin can update this profile'
      }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Filter fields that non-admins cannot update
  let updateData = { ...profileData };
  if (authResult.userRole !== 'admin') {
    const { is_verified, is_active, rating, total_escalations_handled, ...allowedData } = updateData;
    updateData = allowedData;
  }

  const { data, error } = await supabase
    .from('consultant_profiles')
    .update(updateData)
    .eq('id', consultantId)
    .select()
    .single();

  if (error) {
    console.error('Error updating consultant profile:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update consultant profile', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ consultant: data, message: 'Profile updated successfully' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// DELETE handler - Deactivate consultant
async function handleDeleteRequest(url: URL, authResult: any) {
  // Only admins can deactivate consultants
  if (authResult.userRole !== 'admin') {
    return new Response(
      JSON.stringify({ error: 'Access denied: Admin role required' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const consultantId = url.searchParams.get('id');
  if (!consultantId) {
    return new Response(
      JSON.stringify({ error: 'Consultant ID is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Soft delete by setting is_active to false
  const { data, error } = await supabase
    .from('consultant_profiles')
    .update({ is_active: false, availability_status: 'offline' })
    .eq('id', consultantId)
    .select()
    .single();

  if (error) {
    console.error('Error deactivating consultant:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to deactivate consultant', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ message: 'Consultant deactivated successfully' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import {
  withSecurity,
  SecurityContext,
  sanitizeResponse,
} from "../_shared/security-hardening.ts";
import {
  createErrorResponse,
  HTTP_STATUS,
  ERROR_CODES,
} from "../_shared/error-handler.ts";
import { InputSanitizer } from "../_shared/security-utils.ts";

serve(async (req) => {
  return withSecurity(
    req,
    {
      requireAuth: true,
      requiredRole: "admin",
      rateLimitKey: "admin-users",
      rateLimitOptions: {
        maxAttempts: 100, // Higher limit for admin functions
        windowMs: 3600000, // 1 hour
      },
      logActivity: true,
    },
    async (request: Request, context: SecurityContext) => {
      // Initialize Supabase client
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      );

      console.log(
        `[ADMIN-USERS] ${request.method} request from admin ${context.userId}`,
      );

      const url = new URL(request.url);
      const method = request.method;

      if (method === "GET") {
        // GET /admin-users - List users with search and pagination
        const search = InputSanitizer.sanitizeString(
          url.searchParams.get("search") || "",
          100,
        );
        const page = Math.max(parseInt(url.searchParams.get("page") || "1"), 1);
        const limit = Math.min(
          Math.max(parseInt(url.searchParams.get("limit") || "10"), 1),
          100,
        );
        const offset = (page - 1) * limit;

        console.log("Admin user search:", { search, page, limit, offset });

        try {
          // Use RPC function for enhanced security
          const { data: users, error } = await supabase.rpc(
            "get_users_with_roles",
            {
              search_term: search,
              offset_val: offset,
              limit_val: limit,
            },
          );

          if (error) {
            console.error("RPC error, using fallback query:", error);

            // Fallback to manual query with enhanced security
            let query = supabase
              .from("profiles")
              .select(
                `
              user_id,
              email,
              first_name,
              last_name,
              company_name,
              created_at,
              last_active_at,
              status
            `,
              )
              .order("created_at", { ascending: false })
              .range(offset, offset + limit - 1);

            if (search) {
              query = query.or(
                `email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,company_name.ilike.%${search}%`,
              );
            }

            const { data: profiles, error: profileError } = await query;

            if (profileError) {
              return createErrorResponse(
                "Failed to fetch user profiles",
                HTTP_STATUS.INTERNAL_ERROR,
                ERROR_CODES.DATABASE_ERROR,
              );
            }

            // Get roles for each user
            const usersWithRoles = await Promise.all(
              (profiles || []).map(async (profile) => {
                const { data: roleData } = await supabase
                  .from("user_roles")
                  .select("role")
                  .eq("user_id", profile.user_id)
                  .maybeSingle();

                return {
                  ...profile,
                  role: roleData?.role || "business_owner",
                };
              }),
            );

            // Get total count for pagination
            let countQuery = supabase
              .from("profiles")
              .select("user_id", { count: "exact", head: true });

            if (search) {
              countQuery = countQuery.or(
                `email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,company_name.ilike.%${search}%`,
              );
            }

            const { count } = await countQuery;

            const sanitizedResponse = sanitizeResponse(
              {
                users: usersWithRoles,
                pagination: {
                  page,
                  limit,
                  total: count || 0,
                  totalPages: Math.ceil((count || 0) / limit),
                  hasMore: (count || 0) > offset + limit,
                },
              },
              context.userRole,
            );

            return new Response(JSON.stringify(sanitizedResponse), {
              headers: { "Content-Type": "application/json" },
            });
          }

          const sanitizedResponse = sanitizeResponse(users, context.userRole);
          return new Response(JSON.stringify(sanitizedResponse), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("Error in admin-users GET:", error);
          return createErrorResponse(
            "Failed to retrieve users",
            HTTP_STATUS.INTERNAL_ERROR,
            ERROR_CODES.DATABASE_ERROR,
          );
        }
      }

      if (method === "POST") {
        // POST /admin-users/invite - Invite new user
        let body;
        try {
          body = await request.json();
        } catch (error) {
          return createErrorResponse(
            "Invalid JSON in request body",
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.INVALID_INPUT,
          );
        }

        const { email, role } = body;

        // Enhanced input validation
        if (!email || !role) {
          return createErrorResponse(
            "Email and role are required",
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.INVALID_INPUT,
          );
        }

        const sanitizedEmail = InputSanitizer.sanitizeEmail(email);
        if (!sanitizedEmail) {
          return createErrorResponse(
            "Invalid email format",
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.INVALID_INPUT,
          );
        }

        const validRoles = ["business_owner", "consultant", "admin"];
        if (!validRoles.includes(role)) {
          return createErrorResponse(
            "Invalid role specified",
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.INVALID_INPUT,
          );
        }

        // Check if user already exists
        const { data: existingUser } = await supabase
          .from("profiles")
          .select("email")
          .eq("email", sanitizedEmail)
          .maybeSingle();

        if (existingUser) {
          return createErrorResponse(
            "User with this email already exists",
            HTTP_STATUS.CONFLICT,
            ERROR_CODES.DUPLICATE_REQUEST,
          );
        }

        // Generate secure invite token
        const token = crypto.randomUUID();

        // Create invite record with expiration
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours
        const { data: invite, error: inviteError } = await supabase
          .from("invites")
          .insert({
            email: sanitizedEmail,
            role,
            token,
            expires_at: expiresAt.toISOString(),
            created_by: context.userId,
          })
          .select()
          .single();

        if (inviteError) {
          console.error("Failed to create invite:", inviteError);
          return createErrorResponse(
            "Failed to create invitation",
            HTTP_STATUS.INTERNAL_ERROR,
            ERROR_CODES.DATABASE_ERROR,
          );
        }

        // Log invitation creation
        await supabase.from("audit_logs").insert({
          action: "USER_INVITED",
          description: `User invited with role ${role}`,
          user_id: context.userId,
          metadata: {
            invited_email: sanitizedEmail,
            invited_role: role,
            invite_id: invite.id,
            expires_at: expiresAt.toISOString(),
            security_level: "HIGH",
          },
          ip_address: context.ipAddress,
          user_agent: context.userAgent,
        });

        console.log(`Invite created for ${sanitizedEmail} with role ${role}`);

        const sanitizedResponse = sanitizeResponse(
          {
            success: true,
            invite: {
              id: invite.id,
              email: invite.email,
              role: invite.role,
              expires_at: invite.expires_at,
            },
            message: "Invitation created successfully",
          },
          context.userRole,
        );

        return new Response(JSON.stringify(sanitizedResponse), {
          headers: { "Content-Type": "application/json" },
          status: HTTP_STATUS.CREATED,
        });
      }

      if (method === "PATCH") {
        // PATCH /admin-users/:id - Update user role/status
        const pathParts = url.pathname.split("/");
        const userId = pathParts[pathParts.length - 1];

        if (!userId || !InputSanitizer.isValidUUID(userId)) {
          return createErrorResponse(
            "Invalid user ID format",
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.INVALID_INPUT,
          );
        }

        let body;
        try {
          body = await request.json();
        } catch (error) {
          return createErrorResponse(
            "Invalid JSON in request body",
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.INVALID_INPUT,
          );
        }

        const { role, status } = body;

        // Validate inputs
        if (role) {
          const validRoles = ["business_owner", "consultant", "admin"];
          if (!validRoles.includes(role)) {
            return createErrorResponse(
              "Invalid role specified",
              HTTP_STATUS.BAD_REQUEST,
              ERROR_CODES.INVALID_INPUT,
            );
          }
        }

        if (status) {
          const validStatuses = ["active", "inactive", "suspended"];
          if (!validStatuses.includes(status)) {
            return createErrorResponse(
              "Invalid status specified",
              HTTP_STATUS.BAD_REQUEST,
              ERROR_CODES.INVALID_INPUT,
            );
          }
        }

        // Check if user exists
        const { data: targetUser } = await supabase
          .from("profiles")
          .select("user_id, email, first_name, last_name")
          .eq("user_id", userId)
          .single();

        if (!targetUser) {
          return createErrorResponse(
            "User not found",
            HTTP_STATUS.NOT_FOUND,
            ERROR_CODES.NOT_FOUND,
          );
        }

        // Prevent self-demotion from admin role
        if (userId === context.userId && role && role !== "admin") {
          return createErrorResponse(
            "Cannot remove your own admin privileges",
            HTTP_STATUS.FORBIDDEN,
            ERROR_CODES.PERMISSION_DENIED,
          );
        }

        const updates: any = {};
        if (status) updates.status = status;

        // Update profile if needed
        if (Object.keys(updates).length > 0) {
          const { error: profileError } = await supabase
            .from("profiles")
            .update(updates)
            .eq("user_id", userId);

          if (profileError) {
            console.error("Failed to update profile:", profileError);
            return createErrorResponse(
              "Failed to update user profile",
              HTTP_STATUS.INTERNAL_ERROR,
              ERROR_CODES.DATABASE_ERROR,
            );
          }
        }

        // Update role if provided
        if (role) {
          const { error: roleError } = await supabase
            .from("user_roles")
            .upsert({
              user_id: userId,
              role,
              assigned_by: context.userId,
              self_selected: false,
            });

          if (roleError) {
            console.error("Failed to update role:", roleError);
            return createErrorResponse(
              "Failed to update user role",
              HTTP_STATUS.INTERNAL_ERROR,
              ERROR_CODES.DATABASE_ERROR,
            );
          }
        }

        // Log the user update
        await supabase.from("audit_logs").insert({
          action: "USER_UPDATED",
          description: `User ${targetUser.email} updated by admin`,
          user_id: context.userId,
          metadata: {
            target_user_id: userId,
            target_email: targetUser.email,
            updated_role: role,
            updated_status: status,
            security_level: "HIGH",
          },
          ip_address: context.ipAddress,
          user_agent: context.userAgent,
        });

        console.log(`User ${userId} updated by admin ${context.userId}:`, {
          role,
          status,
        });

        return new Response(
          JSON.stringify({
            success: true,
            message: "User updated successfully",
          }),
          {
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      return createErrorResponse(
        `Method ${method} not allowed`,
        HTTP_STATUS.METHOD_NOT_ALLOWED,
        ERROR_CODES.INVALID_INPUT,
      );
    },
  );
});

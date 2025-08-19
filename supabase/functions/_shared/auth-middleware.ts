import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export interface AuthenticatedRequest {
  user: any;
  userId: string;
  email: string;
  userRole: string;
  orgId: string | null;
}

export interface RateLimitOptions {
  maxAttempts: number;
  windowMs: number;
  action: string;
}

// Define role hierarchy for permission checking
const ROLE_HIERARCHY = {
  admin: ["admin", "consultant", "business_owner"],
  consultant: ["consultant", "business_owner"],
  business_owner: ["business_owner"],
} as const;

/**
 * Enhanced authentication middleware with JWT role verification
 */
export async function authenticateRequest(
  req: Request,
  supabaseClient: any,
  requiredRole?: "admin" | "consultant" | "business_owner",
): Promise<AuthenticatedRequest> {
  const authHeader = req.headers.get("Authorization");
  const ipAddress = extractIPAddress(req);
  const userAgent = req.headers.get("user-agent");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    await auditSecurityEvent(
      supabaseClient,
      null,
      "AUTH_HEADER_MISSING",
      "Missing or malformed authorization header",
      {
        userAgent,
        path: new URL(req.url).pathname,
        severity: "MEDIUM",
      },
      ipAddress,
      userAgent,
    );
    throw new Error("Authentication required");
  }

  const token = authHeader.replace("Bearer ", "");

  // Enhanced token validation
  if (!token || token.length < 10) {
    await auditSecurityEvent(
      supabaseClient,
      null,
      "INVALID_TOKEN_FORMAT",
      "Invalid token format provided",
      {
        tokenLength: token?.length || 0,
        severity: "HIGH",
      },
      ipAddress,
      userAgent,
    );
    throw new Error("Invalid token format");
  }

  try {
    const { data, error } = await supabaseClient.auth.getUser(token);

    if (error || !data.user) {
      await auditSecurityEvent(
        supabaseClient,
        null,
        "TOKEN_VALIDATION_FAILED",
        "Token validation failed",
        {
          error: error?.message,
          hasUser: !!data?.user,
          severity: "HIGH",
        },
        ipAddress,
        userAgent,
      );
      throw new Error("Authentication failed");
    }

    if (!data.user.email) {
      await auditSecurityEvent(
        supabaseClient,
        data.user.id,
        "INCOMPLETE_USER_DATA",
        "User missing required email",
        { severity: "MEDIUM" },
        ipAddress,
        userAgent,
      );
      throw new Error("User data incomplete");
    }

    // Get user role from database
    const { data: userRoleData, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .single();

    if (roleError || !userRoleData) {
      await auditSecurityEvent(
        supabaseClient,
        data.user.id,
        "USER_ROLE_MISSING",
        "User has no assigned role",
        { severity: "HIGH" },
        ipAddress,
        userAgent,
      );
      throw new Error("User role not found");
    }

    const userRole = userRoleData.role;

    // Get user's organization ID
    const { data: orgData } = await supabaseClient
      .from("organization_memberships")
      .select("org_id")
      .eq("user_id", data.user.id)
      .single();

    const orgId = orgData?.org_id || null;

    // Check role permission if required role is specified
    if (requiredRole && !hasRolePermission(userRole, requiredRole)) {
      await auditSecurityEvent(
        supabaseClient,
        data.user.id,
        "INSUFFICIENT_PERMISSIONS",
        `User with role '${userRole}' attempted to access '${requiredRole}' protected resource`,
        {
          userRole,
          requiredRole,
          severity: "HIGH",
        },
        ipAddress,
        userAgent,
      );
      throw new Error(
        `Insufficient permissions. Required role: ${requiredRole}`,
      );
    }

    // Log successful authentication
    await auditSecurityEvent(
      supabaseClient,
      data.user.id,
      "SUCCESSFUL_AUTH",
      "User successfully authenticated",
      {
        userRole,
        orgId,
        severity: "LOW",
      },
      ipAddress,
      userAgent,
    );

    return {
      user: data.user,
      userId: data.user.id,
      email: data.user.email,
      userRole,
      orgId,
    };
  } catch (error) {
    if (error instanceof Error && error.message !== "Authentication failed") {
      await auditSecurityEvent(
        supabaseClient,
        null,
        "AUTH_ERROR",
        "Authentication error occurred",
        {
          error: error.message,
          severity: "HIGH",
        },
        ipAddress,
        userAgent,
      );
    }
    throw error;
  }
}

/**
 * Check if user role has permission for required role
 */
function hasRolePermission(userRole: string, requiredRole: string): boolean {
  const allowedRoles = ROLE_HIERARCHY[userRole as keyof typeof ROLE_HIERARCHY];
  return allowedRoles ? allowedRoles.includes(requiredRole as any) : false;
}

/**
 * Enhanced rate limiting with different limits per user role and endpoint
 */
export async function checkRateLimit(
  supabaseClient: any,
  identifier: string,
  userRole: string,
  endpoint: string,
  options?: Partial<RateLimitOptions>,
): Promise<{ allowed: boolean; remainingRequests: number; resetTime: Date }> {
  // Define rate limits per role and endpoint
  const rateLimits = {
    "chat-with-ai": {
      admin: { maxAttempts: 1000, windowMs: 60 * 1000 }, // 1000/min
      consultant: { maxAttempts: 200, windowMs: 60 * 1000 }, // 200/min
      business_owner: { maxAttempts: 50, windowMs: 60 * 1000 }, // 50/min
    },
    "admin-functions": {
      admin: { maxAttempts: 100, windowMs: 60 * 1000 },
      consultant: { maxAttempts: 0, windowMs: 60 * 1000 }, // No access
      business_owner: { maxAttempts: 0, windowMs: 60 * 1000 }, // No access
    },
    "consultant-functions": {
      admin: { maxAttempts: 200, windowMs: 60 * 1000 },
      consultant: { maxAttempts: 100, windowMs: 60 * 1000 },
      business_owner: { maxAttempts: 0, windowMs: 60 * 1000 }, // No access
    },
    default: {
      admin: { maxAttempts: 200, windowMs: 60 * 1000 },
      consultant: { maxAttempts: 100, windowMs: 60 * 1000 },
      business_owner: { maxAttempts: 50, windowMs: 60 * 1000 },
    },
  };

  const limits =
    rateLimits[endpoint as keyof typeof rateLimits] || rateLimits.default;
  const userLimit =
    limits[userRole as keyof typeof limits] || limits["business_owner"];

  // Merge with provided options
  const finalOptions = { ...userLimit, ...options };
  const { maxAttempts, windowMs } = finalOptions;

  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);
  const resetTime = new Date(now.getTime() + windowMs);

  try {
    // Handle anonymous users - use actual IP or fallback
    let rateLimitIdentifier = identifier;

    // If identifier is 'anonymous', we need to use the actual IP address or skip rate limiting
    if (identifier === "anonymous") {
      // For anonymous users, we'll use a generic IP to avoid database errors
      rateLimitIdentifier = "127.0.0.1"; // Use localhost as fallback
    }

    // Validate that the identifier is a valid IP address format
    const isValidIP = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^[0-9a-fA-F:]+$/.test(
      rateLimitIdentifier,
    );
    if (!isValidIP) {
      // If not a valid IP, use the identifier as-is but handle potential DB errors
      console.warn(
        `Invalid IP format for rate limiting: ${rateLimitIdentifier}`,
      );
      return { allowed: true, remainingRequests: maxAttempts, resetTime }; // Allow on invalid IP
    }

    // Count recent attempts for this user/IP combination
    const { data: attempts, error } = await supabaseClient
      .from("auth_rate_limits")
      .select("*")
      .eq("ip_address", rateLimitIdentifier)
      .eq("attempt_type", endpoint)
      .gte("attempted_at", windowStart.toISOString());

    if (error) {
      console.error("Rate limit check error:", error);
      return { allowed: true, remainingRequests: maxAttempts, resetTime }; // Allow on error
    }

    const attemptCount = attempts?.length || 0;
    const remainingRequests = Math.max(0, maxAttempts - attemptCount);

    if (attemptCount >= maxAttempts) {
      console.warn(
        `Rate limit exceeded for ${identifier} on ${endpoint}: ${attemptCount}/${maxAttempts}`,
      );

      // Log rate limit violation
      await auditSecurityEvent(
        supabaseClient,
        null,
        "RATE_LIMIT_EXCEEDED",
        `Rate limit exceeded for ${endpoint}`,
        {
          identifier,
          endpoint,
          userRole,
          attemptCount,
          maxAttempts,
          windowMs,
          severity: "MEDIUM",
        },
        identifier,
      );

      return { allowed: false, remainingRequests: 0, resetTime };
    }

    return { allowed: true, remainingRequests, resetTime };
  } catch (error) {
    console.error("Rate limit check failed:", error);
    return { allowed: true, remainingRequests: maxAttempts, resetTime }; // Allow on error
  }
}

/**
 * Log authentication attempt
 */
export async function logAuthAttempt(
  supabaseClient: any,
  identifier: string,
  action: string,
  success: boolean,
  userAgent?: string,
  userEmail?: string,
): Promise<void> {
  try {
    await supabaseClient.from("auth_rate_limits").insert({
      ip_address: identifier,
      attempt_type: action,
      success,
      user_agent: userAgent,
      user_email: userEmail,
      attempted_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to log auth attempt:", error);
  }
}

/**
 * Audit log security event
 */
export async function auditSecurityEvent(
  supabaseClient: any,
  userId: string | null,
  action: string,
  description: string,
  metadata: any = {},
  ipAddress?: string,
  userAgent?: string,
): Promise<void> {
  try {
    await supabaseClient.from("audit_logs").insert({
      user_id: userId,
      action,
      description,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        source: "edge-function",
      },
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  } catch (error) {
    console.error("Failed to audit security event:", error);
  }
}

/**
 * Sanitize and validate IP address from request headers
 */
export function extractIPAddress(req: Request): string | null {
  // Get IP from various headers in order of preference
  const ipSources = [
    req.headers.get("x-forwarded-for"),
    req.headers.get("x-real-ip"),
    req.headers.get("cf-connecting-ip"), // Cloudflare
    req.headers.get("x-client-ip"),
  ];

  for (const ipHeader of ipSources) {
    if (ipHeader) {
      // Take the first IP from comma-separated list (x-forwarded-for can have multiple IPs)
      const firstIP = ipHeader.split(",")[0].trim();

      // Validate IP format (basic IPv4/IPv6 validation)
      if (isValidIP(firstIP)) {
        return firstIP;
      }
    }
  }

  return null;
}

/**
 * Basic IP address validation
 */
function isValidIP(ip: string): boolean {
  // IPv4 validation
  const ipv4Regex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

  // IPv6 validation (basic)
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Sanitize error messages to prevent information disclosure
 */
export function sanitizeError(
  error: any,
  defaultMessage: string = "An error occurred",
): string {
  // Never expose internal errors to clients
  const sensitivePatterns = [
    /database/i,
    /connection/i,
    /internal/i,
    /timeout/i,
    /credential/i,
    /unauthorized/i,
    /postgresql/i,
    /pg_/i,
    /supabase/i,
    /auth/i,
    /token/i,
    /secret/i,
    /key/i,
    /password/i,
  ];

  const errorMessage = error?.message || error?.toString() || defaultMessage;

  // Check if error contains sensitive information
  const isSensitive = sensitivePatterns.some((pattern) =>
    pattern.test(errorMessage),
  );

  if (isSensitive) {
    return defaultMessage;
  }

  // Return sanitized message
  return errorMessage.substring(0, 200); // Limit length
}

/**
 * Validate and sanitize request input
 */
export function validateRequestInput(
  input: any,
  schema: Record<string, any>,
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const [field, rules] of Object.entries(schema)) {
    const value = input[field];

    // Required field check
    if (
      rules.required &&
      (value === undefined || value === null || value === "")
    ) {
      errors.push(`${field} is required`);
      continue;
    }

    // Skip validation if field is not required and empty
    if (
      !rules.required &&
      (value === undefined || value === null || value === "")
    ) {
      continue;
    }

    // Type validation
    if (rules.type && typeof value !== rules.type) {
      errors.push(`${field} must be of type ${rules.type}`);
    }

    // String length validation
    if (
      rules.minLength &&
      typeof value === "string" &&
      value.length < rules.minLength
    ) {
      errors.push(
        `${field} must be at least ${rules.minLength} characters long`,
      );
    }

    if (
      rules.maxLength &&
      typeof value === "string" &&
      value.length > rules.maxLength
    ) {
      errors.push(
        `${field} must be no more than ${rules.maxLength} characters long`,
      );
    }

    // Pattern validation
    if (
      rules.pattern &&
      typeof value === "string" &&
      !rules.pattern.test(value)
    ) {
      errors.push(`${field} format is invalid`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

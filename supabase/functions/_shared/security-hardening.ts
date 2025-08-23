// Enhanced Security Hardening Module
// Provides comprehensive security measures for all edge functions

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { createErrorResponse, HTTP_STATUS, ERROR_CODES, ValidationError } from './error-handler.ts';
import {
  authenticateRequest,
  checkRateLimit,
  extractIPAddress,
  auditSecurityEvent,
} from './auth-middleware.ts';
import {
  securityHeaders,
  ValidationSchemas,
  InputSanitizer,
  SecurityMonitor,
} from './security-utils.ts';

export interface SecurityContext {
  user: any;
  userId: string;
  userRole: string;
  orgId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string;
}

export interface SecurityOptions {
  requireAuth?: boolean;
  requiredRole?: 'admin' | 'consultant' | 'business_owner';
  rateLimitKey?: string;
  rateLimitOptions?: {
    maxAttempts: number;
    windowMs: number;
  };
  validateInput?: keyof typeof ValidationSchemas;
  logActivity?: boolean;
}

/**
 * Comprehensive security wrapper for edge functions
 */
export async function withSecurity(
  request: Request,
  options: SecurityOptions,
  handler: (req: Request, context: SecurityContext) => Promise<Response>,
): Promise<Response> {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          ...securityHeaders,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        },
      });
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Extract request metadata
    const ipAddress = extractIPAddress(request);
    const userAgent = request.headers.get('user-agent')?.substring(0, 500) || null;

    let securityContext: SecurityContext;

    // Authentication
    if (options.requireAuth !== false) {
      try {
        const authResult = await authenticateRequest(request, supabase, options.requiredRole);
        securityContext = {
          user: authResult.user,
          userId: authResult.userId,
          userRole: authResult.userRole,
          orgId: authResult.orgId,
          ipAddress,
          userAgent,
          requestId,
        };

        // Log successful authentication
        if (options.logActivity) {
          await auditSecurityEvent(
            supabase,
            authResult.userId,
            'FUNCTION_ACCESS',
            `User accessed ${options.rateLimitKey || 'function'}`,
            {
              endpoint: options.rateLimitKey,
              userRole: authResult.userRole,
              requestId,
              security_level: 'LOW',
            },
            ipAddress,
            userAgent,
          );
        }
      } catch (error) {
        // Log failed authentication
        await auditSecurityEvent(
          supabase,
          null,
          'AUTH_FAILED',
          `Authentication failed: ${error.message}`,
          {
            endpoint: options.rateLimitKey,
            error: error.message,
            requestId,
            security_level: 'HIGH',
          },
          ipAddress,
          userAgent,
        );

        return createErrorResponse(
          'Authentication required',
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_CODES.UNAUTHORIZED,
        );
      }
    } else {
      // Public endpoint - create minimal context
      securityContext = {
        user: null,
        userId: 'anonymous',
        userRole: 'anonymous',
        orgId: null,
        ipAddress,
        userAgent,
        requestId,
      };
    }

    // Rate limiting
    if (options.rateLimitKey) {
      // Always use IP address for rate limiting, regardless of authentication status
      const identifier = ipAddress || '127.0.0.1';

      const rateLimitResult = await checkRateLimit(
        supabase,
        identifier,
        securityContext.userRole,
        options.rateLimitKey,
        options.rateLimitOptions,
      );

      if (!rateLimitResult.allowed) {
        // Log rate limit violation
        await auditSecurityEvent(
          supabase,
          securityContext.userId !== 'anonymous' ? securityContext.userId : null,
          'RATE_LIMIT_VIOLATION',
          `Rate limit exceeded for ${options.rateLimitKey}`,
          {
            endpoint: options.rateLimitKey,
            userRole: securityContext.userRole,
            remainingRequests: rateLimitResult.remainingRequests,
            requestId,
            security_level: 'MEDIUM',
          },
          ipAddress,
          userAgent,
        );

        return new Response(
          JSON.stringify({
            error: 'Rate limit exceeded',
            code: ERROR_CODES.RATE_LIMITED,
            details: {
              remainingRequests: rateLimitResult.remainingRequests,
              resetTime: rateLimitResult.resetTime.toISOString(),
              retryAfter: Math.ceil((rateLimitResult.resetTime.getTime() - Date.now()) / 1000),
            },
          }),
          {
            status: HTTP_STATUS.TOO_MANY_REQUESTS,
            headers: {
              ...securityHeaders,
              'Content-Type': 'application/json',
              'X-RateLimit-Remaining': rateLimitResult.remainingRequests.toString(),
              'X-RateLimit-Reset': rateLimitResult.resetTime.toISOString(),
              'Retry-After': Math.ceil(
                (rateLimitResult.resetTime.getTime() - Date.now()) / 1000,
              ).toString(),
            },
          },
        );
      }
    }

    // Input validation
    if (options.validateInput && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
      try {
        const body = await request.json();
        const validation = validateInput(body, options.validateInput);

        if (!validation.isValid) {
          // Log validation failure
          await auditSecurityEvent(
            supabase,
            securityContext.userId !== 'anonymous' ? securityContext.userId : null,
            'INPUT_VALIDATION_FAILED',
            'Request input validation failed',
            {
              endpoint: options.rateLimitKey,
              errors: validation.errors,
              requestId,
              security_level: 'MEDIUM',
            },
            ipAddress,
            userAgent,
          );

          return new Response(
            JSON.stringify({
              error: 'Validation failed',
              code: ERROR_CODES.VALIDATION_FAILED,
              details: { validationErrors: validation.errors },
            }),
            {
              status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
              headers: {
                ...securityHeaders,
                'Content-Type': 'application/json',
              },
            },
          );
        }

        // Create new request with validated body
        request = new Request(request.url, {
          method: request.method,
          headers: request.headers,
          body: JSON.stringify(body),
        });
      } catch (error) {
        return createErrorResponse(
          'Invalid JSON in request body',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INVALID_INPUT,
        );
      }
    }

    // Initialize security monitor
    const securityMonitor = new SecurityMonitor(supabase);

    // Check for suspicious activity
    if (ipAddress) {
      const isSuspicious = await securityMonitor.detectSuspiciousActivity(ipAddress);
      if (isSuspicious) {
        // Log but don't block - allow investigation
        console.warn(`Suspicious activity detected from ${ipAddress}`);
      }
    }

    // Execute the handler with security context
    const response = await handler(request, securityContext);

    // Add security headers to response
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set(
      'Access-Control-Allow-Headers',
      'authorization, x-client-info, apikey, content-type',
    );

    // Log successful completion
    const duration = Date.now() - startTime;
    if (options.logActivity && duration > 1000) {
      // Log slow requests
      await auditSecurityEvent(
        supabase,
        securityContext.userId !== 'anonymous' ? securityContext.userId : null,
        'SLOW_REQUEST',
        `Request took ${duration}ms to complete`,
        {
          endpoint: options.rateLimitKey,
          duration,
          requestId,
          security_level: 'LOW',
        },
        ipAddress,
        userAgent,
      );
    }

    return response;
  } catch (error) {
    // Log unhandled errors
    console.error(`[SECURITY_ERROR] ${requestId}:`, error);

    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      );

      await auditSecurityEvent(
        supabase,
        null,
        'UNHANDLED_ERROR',
        `Unhandled error in security wrapper: ${error.message}`,
        {
          endpoint: options.rateLimitKey,
          error: error.message,
          stack: error.stack?.substring(0, 1000),
          requestId,
          security_level: 'HIGH',
        },
        extractIPAddress(request),
        request.headers.get('user-agent'),
      );
    } catch (logError) {
      console.error('Failed to log security error:', logError);
    }

    // Return sanitized error response
    return createErrorResponse(
      'An internal error occurred',
      HTTP_STATUS.INTERNAL_ERROR,
      ERROR_CODES.INTERNAL_ERROR,
    );
  }
}

/**
 * Input validation helper
 */
function validateInput(
  data: any,
  schemaName: keyof typeof ValidationSchemas,
): { isValid: boolean; errors: ValidationError[] } {
  const schema = ValidationSchemas[schemaName];
  const errors: ValidationError[] = [];

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];

    // Required field check
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push({ field, message: `${field} is required` });
      continue;
    }

    // Skip validation if field is not required and empty
    if (!rules.required && (value === undefined || value === null || value === '')) {
      continue;
    }

    // Type validation
    if (rules.type && typeof value !== rules.type) {
      errors.push({ field, message: `${field} must be of type ${rules.type}` });
    }

    // String length validation
    if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
      errors.push({
        field,
        message: `${field} must be at least ${rules.minLength} characters long`,
      });
    }

    if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
      errors.push({
        field,
        message: `${field} must be no more than ${rules.maxLength} characters long`,
      });
    }

    // Pattern validation
    if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
      errors.push({ field, message: `${field} format is invalid` });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize response data to prevent information leakage
 */
export function sanitizeResponse(data: any, userRole: string): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  // Admin users see everything
  if (userRole === 'admin') {
    return data;
  }

  // Fields to remove for non-admin users
  const sensitiveFields = [
    'password',
    'secret',
    'key',
    'token',
    'credentials',
    'api_key',
    'access_token',
    'refresh_token',
    'private_key',
    'database_url',
    'connection_string',
    'internal_notes',
    'admin_notes',
    'system_metadata',
    'user_agent',
    'ip_address',
    'auth_metadata',
  ];

  function sanitizeObject(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }

    if (obj && typeof obj === 'object') {
      const sanitized = { ...obj };

      // Remove sensitive fields
      sensitiveFields.forEach((field) => {
        delete sanitized[field];
      });

      // Recursively sanitize nested objects
      Object.keys(sanitized).forEach((key) => {
        if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
          sanitized[key] = sanitizeObject(sanitized[key]);
        }
      });

      return sanitized;
    }

    return obj;
  }

  return sanitizeObject(data);
}

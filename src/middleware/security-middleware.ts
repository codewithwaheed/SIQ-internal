// Security middleware for API endpoints
import { guardRequest, requireAdmin } from "@/lib/security-guard";

export interface SecurityContext {
  userId: string;
  userRole: string;
  userEmail?: string;
}

export function createSecurityMiddleware() {
  return {
    // Check if a message should be blocked
    validateMessage: (message: string, context: SecurityContext) => {
      return guardRequest(message, context.userRole, context.userId);
    },

    // Require admin access for sensitive endpoints
    requireAdminAccess: (context: SecurityContext) => {
      requireAdmin(context.userRole);
    },

    // Check if user can access internal data
    canAccessInternalData: (context: SecurityContext): boolean => {
      return context.userRole === "admin";
    },

    // Sanitize response data based on user role
    sanitizeResponse: (data: any, context: SecurityContext): any => {
      if (context.userRole === "admin") {
        return data; // Admins see everything
      }

      // Remove sensitive fields for non-admin users
      if (Array.isArray(data)) {
        return data.map((item) => sanitizeItem(item));
      } else if (typeof data === "object" && data !== null) {
        return sanitizeItem(data);
      }

      return data;
    },
  };
}

function sanitizeItem(item: any): any {
  if (typeof item !== "object" || item === null) {
    return item;
  }

  const sanitized = { ...item };

  // Remove sensitive fields
  const sensitiveFields = [
    "password",
    "secret",
    "key",
    "token",
    "credentials",
    "api_key",
    "access_token",
    "refresh_token",
    "private_key",
    "database_url",
    "connection_string",
    "internal_notes",
    "admin_notes",
    "system_metadata",
  ];

  sensitiveFields.forEach((field) => {
    if (field in sanitized) {
      delete sanitized[field];
    }
  });

  // Recursively sanitize nested objects
  Object.keys(sanitized).forEach((key) => {
    if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
      sanitized[key] = sanitizeItem(sanitized[key]);
    }
  });

  return sanitized;
}

export const securityMiddleware = createSecurityMiddleware();

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
}

export interface SecurityEventData {
  userId?: string;
  action: string;
  description: string;
  metadata?: Record<string, any>;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Enhanced rate limiting with configurable windows and limits
 */
export class RateLimiter {
  private supabase: any;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  async checkLimit(
    identifier: string,
    action: string,
    maxRequests: number,
    windowMs: number,
    req?: Request
  ): Promise<RateLimitResult> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMs);

    try {
      // Count recent requests
      const { data: attempts, error } = await this.supabase
        .from('auth_rate_limits')
        .select('*')
        .eq('ip_address', identifier)
        .eq('attempt_type', action)
        .gte('attempted_at', windowStart.toISOString());

      if (error) {
        console.error('Rate limit check error:', error);
        // Enhanced error logging
        await this.logSecurityEvent({
          action: 'RATE_LIMIT_ERROR',
          description: `Rate limit check failed for ${identifier}`,
          metadata: { error: error.message, action, identifier },
          severity: 'medium'
        }, req);
        
        // Fail secure for critical security endpoints
        const criticalActions = ['login', 'password_reset', 'admin_action'];
        return {
          allowed: !criticalActions.includes(action),
          remaining: 0,
          resetTime: new Date(now.getTime() + windowMs)
        };
      }

      const currentCount = attempts?.length || 0;
      const failedAttempts = attempts?.filter(a => !a.success).length || 0;
      const remaining = Math.max(0, maxRequests - currentCount);
      const resetTime = new Date(now.getTime() + windowMs);

      // Enhanced threat detection
      const failureRate = currentCount > 0 ? failedAttempts / currentCount : 0;
      const isBlocked = currentCount >= maxRequests || 
                       (failureRate > 0.8 && currentCount >= 5);

      // Log suspicious activity
      if (isBlocked && failureRate > 0.7) {
        await this.logSecurityEvent({
          action: 'SUSPICIOUS_PATTERN',
          description: `High failure rate detected: ${failureRate.toFixed(2)}`,
          metadata: { 
            action, 
            identifier, 
            failureRate, 
            currentCount, 
            failedAttempts 
          },
          severity: 'high'
        }, req);
      }

      // Log this attempt
      await this.logAttempt(identifier, action, !isBlocked, req);

      return {
        allowed: !isBlocked,
        remaining,
        resetTime
      };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Enhanced error handling - fail secure for security-critical operations
      const criticalActions = ['login', 'password_reset', 'admin_action', 'role_change'];
      return {
        allowed: !criticalActions.includes(action),
        remaining: 0,
        resetTime: new Date(now.getTime() + windowMs)
      };
    }
  }

  private async logSecurityEvent(
    eventData: SecurityEventData,
    req?: Request
  ): Promise<void> {
    try {
      const ipAddress = this.extractIPAddress(req);
      const userAgent = req?.headers.get('user-agent')?.substring(0, 500) || null;

      await this.supabase
        .from('audit_logs')
        .insert({
          user_id: eventData.userId || null,
          action: `SECURITY_${eventData.action.toUpperCase()}`,
          description: eventData.description,
          metadata: {
            ...eventData.metadata,
            severity: eventData.severity || 'medium',
            timestamp: new Date().toISOString(),
            source: 'rate-limiter'
          },
          ip_address: ipAddress,
          user_agent: userAgent
        });
    } catch (error) {
      console.error('Failed to log security event from rate limiter:', error);
    }
  }

  private extractIPAddress(req?: Request): string | null {
    if (!req) return null;

    const ipSources = [
      req.headers.get("x-forwarded-for"),
      req.headers.get("x-real-ip"),
      req.headers.get("cf-connecting-ip"),
      req.headers.get("x-client-ip")
    ];

    for (const ipHeader of ipSources) {
      if (ipHeader) {
        const firstIP = ipHeader.split(',')[0].trim();
        if (this.isValidIP(firstIP)) {
          return firstIP;
        }
      }
    }

    return null;
  }

  private isValidIP(ip: string): boolean {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  private async logAttempt(
    identifier: string,
    action: string,
    success: boolean,
    req?: Request
  ): Promise<void> {
    try {
      const userAgent = req?.headers.get('user-agent')?.substring(0, 500) || null;
      
      await this.supabase
        .from('auth_rate_limits')
        .insert({
          ip_address: identifier,
          attempt_type: action,
          success,
          user_agent: userAgent,
          attempted_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to log rate limit attempt:', error);
    }
  }
}

/**
 * Security event monitoring and alerting
 */
export class SecurityMonitor {
  private supabase: any;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  async logSecurityEvent(
    eventData: SecurityEventData,
    req?: Request
  ): Promise<void> {
    try {
      const ipAddress = this.extractIPAddress(req);
      const userAgent = req?.headers.get('user-agent')?.substring(0, 500) || null;

      await this.supabase
        .from('audit_logs')
        .insert({
          user_id: eventData.userId || null,
          action: `SECURITY_${eventData.action.toUpperCase()}`,
          description: eventData.description,
          metadata: {
            ...eventData.metadata,
            severity: eventData.severity || 'medium',
            timestamp: new Date().toISOString(),
            source: 'security-monitor'
          },
          ip_address: ipAddress,
          user_agent: userAgent
        });

      // Log high/critical events for immediate attention
      if (eventData.severity === 'high' || eventData.severity === 'critical') {
        console.warn(`SECURITY ALERT [${eventData.severity.toUpperCase()}]: ${eventData.description}`, {
          userId: eventData.userId,
          ipAddress,
          userAgent,
          metadata: eventData.metadata
        });
      }
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  async detectSuspiciousActivity(
    identifier: string,
    windowMs: number = 60000 // 1 minute
  ): Promise<boolean> {
    try {
      const windowStart = new Date(Date.now() - windowMs);

      // Check for suspicious patterns
      const { data: recentAttempts } = await this.supabase
        .from('auth_rate_limits')
        .select('*')
        .eq('ip_address', identifier)
        .gte('attempted_at', windowStart.toISOString());

      if (!recentAttempts) return false;

      // Multiple failed attempts
      const failedAttempts = recentAttempts.filter(attempt => !attempt.success);
      if (failedAttempts.length > 10) {
        await this.logSecurityEvent({
          action: 'SUSPICIOUS_ACTIVITY',
          description: `Multiple failed attempts detected from ${identifier}`,
          metadata: { 
            failedAttempts: failedAttempts.length,
            timeWindow: windowMs,
            attempts: recentAttempts.map(a => ({ 
              type: a.attempt_type, 
              success: a.success, 
              time: a.attempted_at 
            }))
          },
          severity: 'high'
        });
        return true;
      }

      // High volume requests
      if (recentAttempts.length > 50) {
        await this.logSecurityEvent({
          action: 'HIGH_VOLUME',
          description: `High volume requests detected from ${identifier}`,
          metadata: { 
            requestCount: recentAttempts.length,
            timeWindow: windowMs
          },
          severity: 'medium'
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to detect suspicious activity:', error);
      return false;
    }
  }

  private extractIPAddress(req?: Request): string | null {
    if (!req) return null;

    const ipSources = [
      req.headers.get("x-forwarded-for"),
      req.headers.get("x-real-ip"),
      req.headers.get("cf-connecting-ip"),
      req.headers.get("x-client-ip")
    ];

    for (const ipHeader of ipSources) {
      if (ipHeader) {
        const firstIP = ipHeader.split(',')[0].trim();
        if (this.isValidIP(firstIP)) {
          return firstIP;
        }
      }
    }

    return null;
  }

  private isValidIP(ip: string): boolean {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }
}

/**
 * Input sanitization utilities
 */
export class InputSanitizer {
  /**
   * Sanitize string input to prevent XSS and injection attacks
   */
  static sanitizeString(input: string, maxLength: number = 1000): string {
    if (typeof input !== 'string') return '';
    
    return input
      .replace(/[<>'"&]/g, '') // Remove potential XSS characters
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .replace(/javascript:/gi, '') // Remove javascript protocols
      .replace(/data:/gi, '') // Remove data URLs
      .replace(/vbscript:/gi, '') // Remove vbscript
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim()
      .substring(0, maxLength);
  }

  /**
   * Enhanced message content sanitization for chat
   */
  static sanitizeChatMessage(content: string): string {
    if (typeof content !== 'string') return '';
    
    // Length validation
    if (content.length > 10000) {
      throw new Error('Message too long. Maximum 10,000 characters allowed.');
    }
    
    // Remove dangerous patterns
    const sanitized = content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Script tags
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Iframe tags
      .replace(/javascript:/gi, '') // JavaScript URLs
      .replace(/data:(?!image\/(?:png|jpg|jpeg|gif|webp|svg\+xml))/gi, '') // Data URLs except safe images
      .replace(/vbscript:/gi, '') // VBScript
      .replace(/on\w+\s*=/gi, '') // Event handlers
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // Control characters except \t, \n, \r
    
    return sanitized.trim();
  }

  /**
   * Validate message against security patterns
   */
  static validateMessageSecurity(content: string): { isValid: boolean; reason?: string } {
    const dangerousPatterns = [
      /(union\s+select|select\s+.*\s+from)/i, // SQL injection patterns
      /(script|iframe|object|embed|form)/i, // HTML injection
      /(eval\s*\(|function\s*\()/i, // Code execution
      /(document\.|window\.|alert\()/i, // DOM manipulation
      /(<\s*\/?\s*\w+)|(&\w+;)/i // HTML entities/tags
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(content)) {
        return { 
          isValid: false, 
          reason: 'Message contains potentially dangerous content' 
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Sanitize filename for safe storage
   */
  static sanitizeFilename(filename: string): string {
    if (typeof filename !== 'string') return 'unknown';
    
    return filename
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.{2,}/g, '.')
      .replace(/^\.+|\.+$/g, '')
      .replace(/_{2,}/g, '_')
      .substring(0, 100) || 'unknown';
  }

  /**
   * Validate and sanitize email
   */
  static sanitizeEmail(email: string): string | null {
    if (typeof email !== 'string') return null;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleaned = email.trim().toLowerCase();
    
    return emailRegex.test(cleaned) ? cleaned : null;
  }

  /**
   * Validate UUID format
   */
  static isValidUUID(uuid: string): boolean {
    if (typeof uuid !== 'string') return false;
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Enhanced file validation with security checks
   */
  static validateFile(filename: string, size: number, type: string): { isValid: boolean; reason?: string } {
    // File size validation
    if (size > 50 * 1024 * 1024) { // 50MB
      return { isValid: false, reason: 'File too large. Maximum size is 50MB.' };
    }
    
    if (size < 1) {
      return { isValid: false, reason: 'File is empty or corrupted.' };
    }

    // File type validation
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!allowedTypes.includes(type)) {
      return { isValid: false, reason: 'File type not supported.' };
    }

    // Filename validation
    const sanitizedName = this.sanitizeFilename(filename);
    if (sanitizedName.length < 1) {
      return { isValid: false, reason: 'Invalid filename.' };
    }

    // Extension validation
    const ext = filename.toLowerCase().split('.').pop();
    const allowedExtensions = ['pdf', 'txt', 'doc', 'docx', 'xls', 'xlsx'];
    if (!ext || !allowedExtensions.includes(ext)) {
      return { isValid: false, reason: 'File extension not allowed.' };
    }

    return { isValid: true };
  }
}

/**
 * Content Security Policy utilities
 */
export const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.openai.com https://*.supabase.co;",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Permitted-Cross-Domain-Policies': 'none'
};

/**
 * Global input validation schemas
 */
export const ValidationSchemas = {
  chatMessage: {
    content: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 10000,
      pattern: /^[\s\S]*$/ // Allow all printable characters and whitespace
    },
    conversationId: {
      required: false,
      type: 'string',
      pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    }
  },
  
  escalation: {
    conversationId: {
      required: true,
      type: 'string',
      pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    },
    reason: {
      required: false,
      type: 'string',
      maxLength: 500
    },
    priority: {
      required: false,
      type: 'string',
      pattern: /^(low|normal|high|urgent)$/
    }
  },

  conversation: {
    title: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 200
    },
    initialMessage: {
      required: false,
      type: 'string',
      maxLength: 10000
    }
  }
};

/**
 * Enhanced security middleware factory
 */
export function createSecurityMiddleware() {
  return {
    // Validate request input against schema
    validateInput: (data: any, schemaName: keyof typeof ValidationSchemas) => {
      const schema = ValidationSchemas[schemaName];
      const errors: Array<{ field: string; message: string }> = [];
      
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
          errors.push({ field, message: `${field} must be at least ${rules.minLength} characters long` });
        }
        
        if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
          errors.push({ field, message: `${field} must be no more than ${rules.maxLength} characters long` });
        }
        
        // Pattern validation
        if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
          errors.push({ field, message: `${field} format is invalid` });
        }
      }
      
      return {
        isValid: errors.length === 0,
        errors
      };
    },

    // Sanitize message content
    sanitizeMessage: (content: string) => {
      return InputSanitizer.sanitizeChatMessage(content);
    },

    // Check message security
    validateMessageSecurity: (content: string) => {
      return InputSanitizer.validateMessageSecurity(content);
    }
  };
}
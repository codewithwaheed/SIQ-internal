// Enhanced security utilities for the frontend application

/**
 * Content Security Policy configuration
 */
export const getSecurityHeaders = () => {
  return {
    "Content-Security-Policy": [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://checkout.stripe.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://*.supabase.co https://api.stripe.com https://api.openai.com wss://*.supabase.co",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "object-src 'none'",
      "media-src 'self'",
      "worker-src 'self' blob:",
      "child-src 'self'",
      "form-action 'self'",
      "base-uri 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "payment=()",
      "usb=()",
      "screen-wake-lock=()",
      "web-share=()",
    ].join(", "),
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Cross-Origin-Embedder-Policy": "require-corp",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
  };
};

/**
 * Input sanitization utilities
 */
export class InputSanitizer {
  /**
   * Sanitize HTML content to prevent XSS
   */
  static sanitizeHtml(input: string): string {
    return input.replace(/[<>'"&]/g, (char) => {
      const entityMap: { [key: string]: string } = {
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#x27;",
        "&": "&amp;",
      };
      return entityMap[char];
    });
  }

  /**
   * Sanitize filename for safe use
   */
  static sanitizeFilename(filename: string): string {
    return (
      filename
        .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .replace(/\.{2,}/g, ".")
        .replace(/^\.+|\.+$/g, "")
        .replace(/_{2,}/g, "_")
        .substring(0, 100) || "unknown"
    );
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate UUID format
   */
  static validateUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Sanitize and validate file upload
   */
  static validateFileUpload(file: File): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const maxSize = 25 * 1024 * 1024; // 25MB
    const allowedTypes = [
      "application/pdf",
      "text/plain",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    // Check file size
    if (file.size > maxSize) {
      errors.push("File size must be less than 25MB");
    }

    if (file.size === 0) {
      errors.push("File cannot be empty");
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      errors.push("File type not allowed");
    }

    // Check filename
    const sanitizedName = this.sanitizeFilename(file.name);
    if (sanitizedName === "unknown" || sanitizedName.length === 0) {
      errors.push("Invalid filename");
    }

    // Check for potentially dangerous extensions
    const dangerousExtensions = /\.(exe|bat|cmd|scr|vbs|js|jar|com|pif)$/i;
    if (dangerousExtensions.test(file.name)) {
      errors.push("File extension not allowed for security reasons");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Rate limiting helper for frontend
 */
export class ClientRateLimiter {
  private attempts: Map<string, number[]> = new Map();

  checkLimit(key: string, maxAttempts: number, windowMs: number): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!this.attempts.has(key)) {
      this.attempts.set(key, []);
    }

    const attempts = this.attempts.get(key)!;

    // Remove attempts outside the window
    const validAttempts = attempts.filter(
      (timestamp) => timestamp > windowStart,
    );
    this.attempts.set(key, validAttempts);

    // Check if within limit
    if (validAttempts.length >= maxAttempts) {
      return false;
    }

    // Record this attempt
    validAttempts.push(now);
    this.attempts.set(key, validAttempts);

    return true;
  }

  getRemainingAttempts(
    key: string,
    maxAttempts: number,
    windowMs: number,
  ): number {
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!this.attempts.has(key)) {
      return maxAttempts;
    }

    const attempts = this.attempts.get(key)!;
    const validAttempts = attempts.filter(
      (timestamp) => timestamp > windowStart,
    );

    return Math.max(0, maxAttempts - validAttempts.length);
  }
}

/**
 * Security event logger for frontend
 */
export class SecurityLogger {
  static logSecurityEvent(
    eventType: string,
    description: string,
    metadata?: Record<string, any>,
  ): void {
    console.warn(`SECURITY EVENT [${eventType}]: ${description}`, {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...metadata,
    });
  }

  static logSuspiciousActivity(
    activity: string,
    details?: Record<string, any>,
  ): void {
    this.logSecurityEvent("SUSPICIOUS_ACTIVITY", activity, {
      severity: "HIGH",
      ...details,
    });
  }
}

/**
 * Secure storage utilities
 */
export class SecureStorage {
  /**
   * Store sensitive data with encryption awareness
   */
  static store(key: string, value: any, sensitive: boolean = false): void {
    try {
      if (sensitive) {
        // For sensitive data, warn if not HTTPS
        if (!window.location.protocol.startsWith("https")) {
          SecurityLogger.logSecurityEvent(
            "INSECURE_STORAGE_WARNING",
            "Sensitive data stored over non-HTTPS connection",
          );
        }
      }

      const serialized = JSON.stringify({
        value,
        timestamp: Date.now(),
        sensitive,
      });

      localStorage.setItem(key, serialized);
    } catch (error) {
      SecurityLogger.logSecurityEvent(
        "STORAGE_ERROR",
        "Failed to store data securely",
        { error: error instanceof Error ? error.message : "Unknown error" },
      );
    }
  }

  /**
   * Retrieve data with validation
   */
  static retrieve(key: string): any {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;

      const parsed = JSON.parse(item);

      // Check if data is too old (basic expiration)
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      if (Date.now() - parsed.timestamp > maxAge) {
        this.remove(key);
        return null;
      }

      return parsed.value;
    } catch (error) {
      SecurityLogger.logSecurityEvent(
        "STORAGE_READ_ERROR",
        "Failed to read stored data",
        { error: error instanceof Error ? error.message : "Unknown error" },
      );
      return null;
    }
  }

  /**
   * Securely remove data
   */
  static remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      SecurityLogger.logSecurityEvent(
        "STORAGE_REMOVE_ERROR",
        "Failed to remove stored data",
        { error: error instanceof Error ? error.message : "Unknown error" },
      );
    }
  }
}

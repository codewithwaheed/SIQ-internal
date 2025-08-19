// Password validation utilities
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
  score: number;
}

export class PasswordValidator {
  private static readonly MIN_LENGTH = 14;
  private static readonly COMMON_PASSWORDS = [
    'password',
    '123456',
    '123456789',
    'qwerty',
    'abc123',
    'password123',
    'admin',
    'letmein',
    'welcome',
    'monkey',
    '1234567890',
    'password1',
  ];

  /**
   * Validate password strength and compliance
   */
  static validate(password: string): PasswordValidationResult {
    const errors: string[] = [];
    let score = 0;

    // Check minimum length (enhanced to 14)
    if (password.length < this.MIN_LENGTH) {
      errors.push(`Password must be at least ${this.MIN_LENGTH} characters long`);
    } else {
      score += 1;
    }

    // Check for uppercase letters
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    } else {
      score += 1;
    }

    // Check for lowercase letters
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    } else {
      score += 1;
    }

    // Check for numbers
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    } else {
      score += 1;
    }

    // Check for special characters
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    } else {
      score += 1;
    }

    // Check against common passwords
    if (this.COMMON_PASSWORDS.includes(password.toLowerCase())) {
      errors.push('Password is too common and easily guessable');
      score -= 2;
    }

    // Check for consecutive characters
    if (/(.)\1{2,}/.test(password)) {
      errors.push('Password should not contain more than 2 consecutive identical characters');
      score -= 1;
    }

    // Check for keyboard patterns
    const keyboardPatterns = ['qwerty', 'asdfgh', 'zxcvbn', '123456', '098765', 'abcdef'];
    for (const pattern of keyboardPatterns) {
      if (password.toLowerCase().includes(pattern)) {
        errors.push('Password should not contain keyboard patterns');
        score -= 1;
        break;
      }
    }

    // Calculate strength
    const isValid = errors.length === 0;
    let strength: 'weak' | 'medium' | 'strong' = 'weak';

    if (isValid && score >= 4) {
      if (score >= 5 && password.length >= 16) {
        strength = 'strong';
      } else {
        strength = 'medium';
      }
    }

    return {
      isValid,
      errors,
      strength,
      score: Math.max(0, score),
    };
  }

  /**
   * Generate password strength indicator
   */
  static getStrengthIndicator(result: PasswordValidationResult): {
    color: string;
    text: string;
    percentage: number;
  } {
    const maxScore = 5;
    const percentage = Math.min(100, (result.score / maxScore) * 100);

    switch (result.strength) {
      case 'strong':
        return {
          color: 'text-green-600',
          text: 'Strong',
          percentage: Math.max(80, percentage),
        };
      case 'medium':
        return {
          color: 'text-yellow-600',
          text: 'Medium',
          percentage: Math.max(50, percentage),
        };
      default:
        return {
          color: 'text-red-600',
          text: 'Weak',
          percentage: Math.min(40, percentage),
        };
    }
  }

  /**
   * Check if password has been compromised (client-side heuristics)
   */
  static checkCompromised(password: string): boolean {
    // Simple heuristics for client-side checking
    const suspiciousPatterns = [
      /password\d+/i,
      /admin\d+/i,
      /user\d+/i,
      /test\d+/i,
      /^[a-z]+\d{1,4}$/i, // Simple word + numbers
      /^\d{4,8}$/, // Only numbers
      /^[a-z]{4,8}$/i, // Only letters
    ];

    return suspiciousPatterns.some((pattern) => pattern.test(password));
  }
}

/**
 * Enhanced auth error handler with specific error codes
 */
export class AuthErrorHandler {
  private static readonly ERROR_MESSAGES: Record<string, string> = {
    'Invalid login credentials':
      'Invalid email or password. Please check your credentials and try again.',
    'Email not confirmed':
      'Please check your email and click the confirmation link before signing in.',
    'Too many requests': 'Too many login attempts. Please wait a few minutes before trying again.',
    'User already registered': 'An account with this email already exists. Please sign in instead.',
    'Weak password':
      'Password does not meet security requirements. Please choose a stronger password.',
    signup_disabled: 'New registrations are currently disabled. Please contact support.',
    email_address_invalid: 'Please enter a valid email address.',
    password_too_short: 'Password must be at least 12 characters long.',
    rate_limit_exceeded: 'Too many attempts. Please wait before trying again.',
    invalid_credentials: 'The email or password you entered is incorrect.',
    email_already_exists: 'This email is already registered. Try signing in instead.',
    network_error: 'Network connection error. Please check your internet connection and try again.',
  };

  /**
   * Get user-friendly error message
   */
  static getErrorMessage(error: any): string {
    if (!error) return 'An unexpected error occurred. Please try again.';

    // Handle Supabase auth errors
    if (error.message) {
      const message = error.message.toLowerCase();

      // Direct message mapping
      for (const [key, friendlyMessage] of Object.entries(this.ERROR_MESSAGES)) {
        if (message.includes(key.toLowerCase())) {
          return friendlyMessage;
        }
      }

      // Pattern matching for common error types
      if (message.includes('email') && message.includes('already')) {
        return this.ERROR_MESSAGES['email_already_exists'];
      }

      if (message.includes('rate') && message.includes('limit')) {
        return this.ERROR_MESSAGES['rate_limit_exceeded'];
      }

      if (
        message.includes('invalid') &&
        (message.includes('credentials') || message.includes('password'))
      ) {
        return this.ERROR_MESSAGES['invalid_credentials'];
      }

      if (message.includes('network') || message.includes('fetch')) {
        return this.ERROR_MESSAGES['network_error'];
      }
    }

    // Return original message if it seems user-friendly, otherwise return generic message
    const originalMessage = error.message || error.toString();
    if (originalMessage.length < 100 && !originalMessage.includes('Error:')) {
      return originalMessage;
    }

    return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
  }

  /**
   * Check if error indicates rate limiting
   */
  static isRateLimited(error: any): boolean {
    const message = error?.message?.toLowerCase() || '';
    return (
      (message.includes('rate') && message.includes('limit')) ||
      message.includes('too many') ||
      error?.status === 429
    );
  }

  /**
   * Check if error indicates network/connection issues
   */
  static isNetworkError(error: any): boolean {
    const message = error?.message?.toLowerCase() || '';
    return (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection') ||
      error?.status === 0 ||
      !navigator.onLine
    );
  }

  /**
   * Get suggested action for error
   */
  static getSuggestedAction(error: any): string {
    if (this.isRateLimited(error)) {
      return 'Please wait a few minutes before trying again.';
    }

    if (this.isNetworkError(error)) {
      return 'Please check your internet connection and try again.';
    }

    const message = error?.message?.toLowerCase() || '';

    if (message.includes('email') && message.includes('already')) {
      return 'Try signing in with this email instead of creating a new account.';
    }

    if (message.includes('invalid') && message.includes('credentials')) {
      return 'Double-check your email and password, or try resetting your password.';
    }

    if (message.includes('email') && message.includes('confirm')) {
      return 'Check your email inbox and spam folder for a confirmation link.';
    }

    return 'If this problem continues, please contact our support team.';
  }
}

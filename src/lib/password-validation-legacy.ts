// Legacy password validation function for backward compatibility
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  score: number;
}

export const validatePassword = (password: string): PasswordValidationResult => {
  const errors: string[] = [];
  let score = 0;

  // Enhanced length check (increased to 14)
  if (password.length < 14) {
    errors.push('Password must be at least 14 characters long');
  } else {
    score += 25;
  }

  // Uppercase check
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else {
    score += 20;
  }

  // Lowercase check
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else {
    score += 20;
  }

  // Number check
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  } else {
    score += 20;
  }

  // Special character check (now required)
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  } else {
    score += 15;
  }

  // Check for common patterns
  if (/(?:password|123456|qwerty|admin|login)/i.test(password)) {
    errors.push('Password contains common unsafe patterns');
    score = Math.max(0, score - 30);
  }

  // Complexity bonus for longer passwords
  if (password.length >= 16) {
    score += 5;
  }
  if (password.length >= 20) {
    score += 5;
  }

  return {
    isValid: errors.length === 0,
    errors,
    score: Math.min(score, 100),
  };
};

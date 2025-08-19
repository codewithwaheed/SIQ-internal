import { useState, useEffect } from 'react';
import { sanitizeHtml, sanitizeText } from '@/lib/sanitization';

/**
 * Enhanced security utilities for protecting against various attack vectors
 */

// Security patterns to detect and block
const SECURITY_PATTERNS = [
  // XSS patterns
  /<script[^>]*>.*?<\/script>/gi,
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /on\w+\s*=/gi,
  
  // SQL injection patterns
  /(\bselect\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b|\bcreate\b|\balter\b)\s+/gi,
  /(union\s+select|exec\s*\(|script\s*\()/gi,
  
  // File path traversal
  /\.\.[\/\\]/g,
  /\/etc\/passwd/gi,
  /\/windows\/system32/gi,
  
  // Command injection
  /[\$`;&|]/g,
  /\b(rm|del|format|shutdown)\b/gi
];

// Suspicious content patterns
const SUSPICIOUS_PATTERNS = [
  /password|secret|token|api[_-]?key|private[_-]?key/gi,
  /admin|root|system|debug|test/gi,
  /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Credit card patterns
  /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g // SSN patterns
];

export interface SecurityValidationResult {
  isValid: boolean;
  threats: string[];
  sanitizedContent?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface SecurityConfig {
  enableXSSProtection: boolean;
  enableSQLInjectionProtection: boolean;
  enablePathTraversalProtection: boolean;
  enableCommandInjectionProtection: boolean;
  enableSensitiveDataDetection: boolean;
  maxContentLength: number;
  allowedFileTypes: string[];
}

const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  enableXSSProtection: true,
  enableSQLInjectionProtection: true,
  enablePathTraversalProtection: true,
  enableCommandInjectionProtection: true,
  enableSensitiveDataDetection: true,
  maxContentLength: 10000,
  allowedFileTypes: ['pdf', 'doc', 'docx', 'txt', 'jpg', 'png', 'gif']
};

/**
 * Comprehensive security validation for user input
 */
export function validateSecurityThreats(
  content: string, 
  config: Partial<SecurityConfig> = {}
): SecurityValidationResult {
  const finalConfig = { ...DEFAULT_SECURITY_CONFIG, ...config };
  const threats: string[] = [];
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

  if (!content || typeof content !== 'string') {
    return { isValid: true, threats: [], riskLevel: 'low' };
  }

  // Check content length
  if (content.length > finalConfig.maxContentLength) {
    threats.push('Content exceeds maximum allowed length');
    riskLevel = 'medium';
  }

  // XSS detection
  if (finalConfig.enableXSSProtection) {
    const xssPatterns = SECURITY_PATTERNS.slice(0, 5);
    for (const pattern of xssPatterns) {
      if (pattern.test(content)) {
        threats.push('Potential XSS attack detected');
        riskLevel = 'critical';
        break;
      }
    }
  }

  // SQL injection detection
  if (finalConfig.enableSQLInjectionProtection) {
    const sqlPatterns = SECURITY_PATTERNS.slice(5, 7);
    for (const pattern of sqlPatterns) {
      if (pattern.test(content)) {
        threats.push('Potential SQL injection detected');
        riskLevel = 'critical';
        break;
      }
    }
  }

  // Path traversal detection
  if (finalConfig.enablePathTraversalProtection) {
    const pathPatterns = SECURITY_PATTERNS.slice(7, 10);
    for (const pattern of pathPatterns) {
      if (pattern.test(content)) {
        threats.push('Potential path traversal attack detected');
        riskLevel = 'high';
        break;
      }
    }
  }

  // Command injection detection
  if (finalConfig.enableCommandInjectionProtection) {
    const cmdPatterns = SECURITY_PATTERNS.slice(10);
    for (const pattern of cmdPatterns) {
      if (pattern.test(content)) {
        threats.push('Potential command injection detected');
        riskLevel = 'critical';
        break;
      }
    }
  }

  // Sensitive data detection
  if (finalConfig.enableSensitiveDataDetection) {
    for (const pattern of SUSPICIOUS_PATTERNS) {
      if (pattern.test(content)) {
        threats.push('Potentially sensitive information detected');
        if (riskLevel === 'low') riskLevel = 'medium';
        break;
      }
    }
  }

  // Sanitize content if threats are found
  let sanitizedContent = content;
  if (threats.length > 0) {
    sanitizedContent = sanitizeText(content);
  }

  return {
    isValid: threats.length === 0,
    threats,
    sanitizedContent,
    riskLevel
  };
}

/**
 * Hook for real-time security validation in React components
 */
export function useSecurityValidation(
  initialContent: string = '',
  config: Partial<SecurityConfig> = {}
) {
  const [content, setContent] = useState(initialContent);
  const [validation, setValidation] = useState<SecurityValidationResult>({
    isValid: true,
    threats: [],
    riskLevel: 'low'
  });

  useEffect(() => {
    const result = validateSecurityThreats(content, config);
    setValidation(result);
  }, [content]);

  const updateContent = (newContent: string) => {
    setContent(newContent);
  };

  return {
    content,
    updateContent,
    validation,
    isSecure: validation.isValid,
    threats: validation.threats,
    riskLevel: validation.riskLevel
  };
}

/**
 * Validate file uploads for security
 */
export function validateFileUpload(file: File): SecurityValidationResult {
  const threats: string[] = [];
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

  // Check file size (50MB limit)
  if (file.size > 50 * 1024 * 1024) {
    threats.push('File size exceeds 50MB limit');
    riskLevel = 'medium';
  }

  // Check file type
  const allowedTypes = DEFAULT_SECURITY_CONFIG.allowedFileTypes;
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  
  if (!fileExtension || !allowedTypes.includes(fileExtension)) {
    threats.push('File type not allowed');
    riskLevel = 'high';
  }

  // Check for executable files
  const dangerousExtensions = ['exe', 'bat', 'cmd', 'scr', 'com', 'pif', 'js', 'jar'];
  if (fileExtension && dangerousExtensions.includes(fileExtension)) {
    threats.push('Potentially dangerous file type detected');
    riskLevel = 'critical';
  }

  // Check filename for suspicious patterns
  const filenameValidation = validateSecurityThreats(file.name);
  threats.push(...filenameValidation.threats);
  
  if (filenameValidation.riskLevel === 'critical') {
    riskLevel = 'critical';
  } else if (filenameValidation.riskLevel === 'high' && riskLevel !== 'critical') {
    riskLevel = 'high';
  }

  return {
    isValid: threats.length === 0,
    threats,
    riskLevel
  };
}

/**
 * Security middleware for API requests
 */
export function createSecurityHeaders(): Record<string, string> {
  return {
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  };
}
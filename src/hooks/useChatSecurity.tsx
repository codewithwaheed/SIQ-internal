import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { validateSecurityThreats, SecurityValidationResult } from '@/lib/security-enhanced';
import { sanitizeText } from '@/lib/sanitization';

interface UseChatSecurityReturn {
  validateMessage: (content: string) => SecurityValidationResult;
  sanitizeInput: (content: string) => string;
  checkAuthentication: () => boolean;
  validateSession: () => Promise<boolean>;
}

export const useChatSecurity = (): UseChatSecurityReturn => {
  const { user, session } = useAuth();
  const { toast } = useToast();

  const sanitizeInput = useCallback((content: string): string => {
    if (!content) return '';

    // Use enhanced sanitization
    return sanitizeText(content);
  }, []);

  const validateMessage = useCallback(
    (content: string): SecurityValidationResult => {
      if (!content || !content.trim()) {
        return {
          isValid: false,
          threats: ['Message cannot be empty'],
          riskLevel: 'medium',
        };
      }

      // Use enhanced security validation
      const securityResult = validateSecurityThreats(content);

      if (!securityResult.isValid) {
        return {
          isValid: false,
          threats: securityResult.threats,
          riskLevel: securityResult.riskLevel,
        };
      }

      // Check message length (10,000 character limit)
      if (content.length > 10000) {
        return {
          isValid: false,
          threats: ['Message is too long. Please keep it under 10,000 characters.'],
          riskLevel: 'medium',
        };
      }

      // Check for excessive special characters (potential spam)
      const specialCharRatio =
        (content.match(/[!@#$%^&*()_+={}\[\]|\\:";'<>?,.\/~`]/g) || []).length / content.length;
      if (specialCharRatio > 0.5) {
        return {
          isValid: false,
          threats: ['Message contains too many special characters'],
          riskLevel: 'medium',
        };
      }

      // Sanitize content
      const sanitizedContent = sanitizeInput(content);

      return {
        isValid: true,
        threats: [],
        sanitizedContent,
        riskLevel: 'low',
      };
    },
    [sanitizeInput],
  );

  const checkAuthentication = useCallback((): boolean => {
    if (!user || !session) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to continue chatting.',
        variant: 'destructive',
      });
      return false;
    }
    return true;
  }, [user, session, toast]);

  const validateSession = useCallback(async (): Promise<boolean> => {
    try {
      if (!session) {
        return false;
      }

      // Check if session is still valid
      const now = Date.now();
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;

      if (expiresAt && now > expiresAt) {
        toast({
          title: 'Session Expired',
          description: 'Please sign in again to continue.',
          variant: 'destructive',
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }, [session, toast]);

  return {
    validateMessage,
    sanitizeInput,
    checkAuthentication,
    validateSession,
  };
};

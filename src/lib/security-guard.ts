// Security Guard System - Protects internal data and provides compliance responses

const REFUSAL_MESSAGE =
  "I'm sorry, but I can't share that. However, I'm happy to help you with cybersecurity compliance questions.";
const REDIRECT_MESSAGE = "Let's move on to compliance topics I can help with.";

// Enhanced patterns for comprehensive security coverage
const BLOCK_PATTERNS = [
  // Credentials and sensitive info
  /admin\s+password/i,
  /root\s+password/i,
  /api\s+key/i,
  /secret\s+key/i,
  /access\s+token/i,
  /refresh\s+token/i,
  /database\s+password/i,
  /connection\s+string/i,
  /private\s+key/i,
  /certificate/i,

  // Source code and architecture
  /source\s+code/i,
  /model\s+architecture/i,
  /system\s+architecture/i,
  /backend\s+code/i,
  /server\s+code/i,
  /edge\s+function/i,
  /supabase\s+function/i,
  /github\s+repo/i,
  /repository\s+url/i,

  // Training data and model info
  /training\s+data/i,
  /where\s+do\s+you\s+get\s+your\s+data/i,
  /who\s+made\s+you/i,
  /who\s+created\s+you/i,
  /your\s+training/i,
  /model\s+weights/i,
  /vector\s+database/i,
  /embedding\s+data/i,

  // Internal documentation and logs
  /internal\s+(docs?|documentation)/i,
  /internal\s+logs?/i,
  /internal\s+database/i,
  /internal\s+schema/i,
  /system\s+logs?/i,
  /error\s+logs?/i,
  /audit\s+logs?/i,
  /console\s+logs?/i,
  /debug\s+logs?/i,

  // Infrastructure and configuration
  /s3\s+bucket/i,
  /aws\s+credentials/i,
  /azure\s+credentials/i,
  /gcp\s+credentials/i,
  /server\s+config/i,
  /environment\s+variables/i,
  /env\s+file/i,
  /docker\s+config/i,
  /kubernetes\s+config/i,
  /deployment\s+config/i,

  // Data dumps and exports (enhanced)
  /(full|entire|complete)\s+(database|knowledge\s*base|kb)/i,
  /(full|entire|complete)\s+(log|chat\s*history)/i,
  /(dump|export|download)\s+(all|everything)/i,
  /(dump|export|download)\s+(raw|unfiltered)/i,
  /bulk\s+(export|download)/i,
  /mass\s+(export|download)/i,
  /backup\s+(file|data)/i,
  /entire\s+dataset/i,

  // SQL injection attempts (enhanced)
  /select\s+\*\s+from/i,
  /union\s+all.*select/i,
  /drop\s+table/i,
  /delete\s+from/i,
  /truncate\s+table/i,
  /alter\s+table/i,
  /create\s+table/i,
  /grant\s+all/i,
  /revoke\s+all/i,
  /insert\s+into.*values/i,

  // File system access (enhanced)
  /show\s+me\s+the\s+files/i,
  /list\s+all\s+files/i,
  /file\s+system/i,
  /directory\s+listing/i,
  /read\s+file/i,
  /access\s+filesystem/i,
  /browse\s+folders/i,

  // PII and sensitive data requests
  /user\s+emails/i,
  /customer\s+data/i,
  /personal\s+information/i,
  /credit\s+card/i,
  /social\s+security/i,
  /phone\s+numbers/i,
  /addresses/i,
  /financial\s+data/i,

  // Business intelligence and competitive info
  /revenue\s+data/i,
  /customer\s+list/i,
  /pricing\s+strategy/i,
  /business\s+plan/i,
  /financial\s+reports/i,
  /profit\s+margins/i,

  // Edge case vectors
  /jailbreak/i,
  /ignore\s+(previous|all)\s+instructions/i,
  /pretend\s+you\s+are/i,
  /act\s+as\s+if/i,
  /forget\s+everything/i,
  /your\s+system\s+prompt/i,
  /base64/i,
  /hex\s+encoded/i,
  /rot13/i,
];

interface SecurityGuardState {
  dataRequestAttempts: number;
  lastAttemptTime: number;
}

// In-memory storage for attempt tracking (in production, use Redis or database)
const userAttempts = new Map<string, SecurityGuardState>();

export interface GuardResult {
  blocked: boolean;
  message?: string;
  shouldRedirect?: boolean;
}

export function guardRequest(
  userMessage: string,
  userRole: string = 'user',
  userId: string = 'anonymous',
): GuardResult {
  // Input validation
  if (!userMessage || typeof userMessage !== 'string') {
    return { blocked: false };
  }

  // Normalize message for better pattern matching
  const normalizedMessage = userMessage.toLowerCase().trim();

  // Admins can access everything (but still log for audit)
  if (userRole === 'admin') {
    // Log admin access for audit purposes
    console.log('[SECURITY-GUARD] Admin bypass', {
      userId,
      message: normalizedMessage.substring(0, 100),
    });
    return { blocked: false };
  }

  // Check if message contains blocked patterns
  const blockedPattern = BLOCK_PATTERNS.find((pattern) => pattern.test(normalizedMessage));

  if (!blockedPattern) {
    return { blocked: false };
  }

  // Log the blocked attempt
  console.warn('[SECURITY-GUARD] Blocked request', {
    userId,
    userRole,
    pattern: blockedPattern.source,
    message: normalizedMessage.substring(0, 100) + '...',
    timestamp: new Date().toISOString(),
  });

  // Track attempts for this user
  const now = Date.now();
  const userState = userAttempts.get(userId) || {
    dataRequestAttempts: 0,
    lastAttemptTime: 0,
  };

  // Reset attempts if more than 1 hour has passed
  if (now - userState.lastAttemptTime > 3600000) {
    userState.dataRequestAttempts = 0;
  }

  userState.dataRequestAttempts++;
  userState.lastAttemptTime = now;
  userAttempts.set(userId, userState);

  // After 3 attempts, show redirect message
  if (userState.dataRequestAttempts >= 3) {
    console.warn('[SECURITY-GUARD] Repeated violation', {
      userId,
      attemptCount: userState.dataRequestAttempts,
      pattern: blockedPattern.source,
    });

    return {
      blocked: true,
      message: REDIRECT_MESSAGE,
      shouldRedirect: true,
    };
  }

  return {
    blocked: true,
    message: REFUSAL_MESSAGE,
    shouldRedirect: false,
  };
}

export function isAdminRole(userRole: string): boolean {
  return userRole === 'admin';
}

export function requireAdmin(userRole: string): void {
  if (!isAdminRole(userRole)) {
    throw new Error('Access denied: Admin role required');
  }
}

// Compliance topic suggestions
export const COMPLIANCE_TOPICS = [
  'NIST Cybersecurity Framework implementation',
  'ISO 27001 compliance requirements',
  'SOC 2 audit preparation',
  'CMMC compliance for defense contractors',
  'HIPAA security controls for healthcare',
  'PCI DSS requirements for payment processing',
  'GDPR data protection compliance',
  'Incident response planning',
  'Risk assessment methodologies',
  'Security awareness training programs',
];

export function getComplianceTopicSuggestion(): string {
  const randomTopic = COMPLIANCE_TOPICS[Math.floor(Math.random() * COMPLIANCE_TOPICS.length)];
  return `Would you like help with ${randomTopic}?`;
}

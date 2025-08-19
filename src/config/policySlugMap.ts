/**
 * Maps user input phrases to policy template slugs
 * Used for fuzzy matching in policy intent detection
 */

export const POLICY_SLUG_MAP = {
  // Password Management
  'password': 'password_management',
  'password management': 'password_management', 
  'password policy': 'password_management',
  'account': 'password_management',
  'account management': 'password_management',
  'authentication': 'password_management',
  'credential': 'password_management',

  // Acceptable Use Policy
  'acceptable use': 'acceptable_use',
  'aup': 'acceptable_use',
  'computer use': 'acceptable_use',
  'internet use': 'acceptable_use',
  'it use': 'acceptable_use',
  'technology use': 'acceptable_use',

  // Incident Response
  'incident': 'incident_response',
  'incident response': 'incident_response',
  'emergency': 'incident_response',
  'breach': 'incident_response',
  'security incident': 'incident_response',
  'cyber incident': 'incident_response',

  // Mobile Device Policy
  'mobile': 'mobile_device',
  'mobile device': 'mobile_device',
  'device': 'mobile_device',
  'phone': 'mobile_device',
  'tablet': 'mobile_device',
  'byod': 'mobile_device',
  'bring your own device': 'mobile_device',

  // Access Control (future template)
  'access': 'access_control',
  'access control': 'access_control',
  'authorization': 'access_control',
  'user access': 'access_control',

  // Change Management (future template)
  'change': 'change_management',
  'change management': 'change_management',
  'change control': 'change_management'
} as const;

export type PolicySlug = typeof POLICY_SLUG_MAP[keyof typeof POLICY_SLUG_MAP];

/**
 * Finds policy slug from user input using fuzzy matching
 */
export function findPolicySlug(userInput: string): PolicySlug | null {
  const normalized = userInput.toLowerCase().trim();
  
  // Direct match first
  if (normalized in POLICY_SLUG_MAP) {
    return POLICY_SLUG_MAP[normalized as keyof typeof POLICY_SLUG_MAP];
  }
  
  // Partial matching for phrases
  for (const [phrase, slug] of Object.entries(POLICY_SLUG_MAP)) {
    if (normalized.includes(phrase)) {
      return slug;
    }
  }
  
  return null;
}
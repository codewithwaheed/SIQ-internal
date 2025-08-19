export const DEFAULTS = {
  // Common fields
  business_name: 'ACME Corp',
  today: () => new Date().toISOString().split('T')[0],

  // Password Policy defaults
  policy_title: 'Password Management Policy',
  intro:
    'Strong password practices are fundamental to information security and protecting organizational assets from unauthorized access.',
  min_password_length: '12',
  complexity_requirements: 'uppercase letters, lowercase letters, numbers, and special characters',
  password_rotation_days: '90',
  password_history_count: '12',
  lockout_threshold: '5',
  lockout_duration_minutes: '15',
  mfa_required: 'Yes, for all privileged accounts and remote access',

  // Acceptable Use Policy defaults
  personal_use_allowed: 'Yes, limited and reasonable',
  personal_use_time_limit: '30 minutes',
  incident_reporting_hours: '24',

  // Incident Response Policy defaults
  initial_response_time: '15',
  containment_time: '4',
  recovery_planning_time: '24',
  full_recovery_time: '7',

  // Mobile Device Policy defaults
  device_types_allowed: 'Company-owned smartphones, tablets, and laptops',
  encryption_required: 'Yes, full device encryption mandatory',
  remote_wipe_enabled: 'Yes, for all enrolled devices',
  app_store_policy: 'Company-approved applications only',

  // Data Classification defaults
  classification_levels: 'Public, Internal, Confidential, Restricted',
  retention_period_confidential: '7 years',
  retention_period_internal: '5 years',

  // Default responsibilities and consequences
  consequences:
    'Violations may result in disciplinary action up to and including termination of employment or contract, and may result in civil or criminal liability.',

  // Contact information
  security_contact: 'security@company.com',
  it_helpdesk: 'helpdesk@company.com',
  hr_contact: 'hr@company.com',
} as const satisfies Record<string, string | (() => string)>;

/**
 * Default values for policy template placeholders v2.0
 * Used when user chooses "Use Defaults" or values are missing
 */
export const POLICY_DEFAULTS = {
  // Common organizational fields
  business_name: 'Your Organization',
  organization_name: 'Your Organization',
  company_name: 'Your Organization',
  company_address: '123 Business St, City, State 12345',
  company_email: 'info@yourorganization.com',
  company_phone: '(555) 123-4567',

  // Policy metadata (auto-generated)
  policy_title: '', // Will be set by template
  today: new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }),
  current_date: new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }),
  version: '1.0',
  effective_date: new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }),
  next_review_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }),

  // Standard policy sections
  intro:
    'Strong password practices are fundamental to information security and protecting organizational assets from unauthorized access.',
  purpose: 'To protect organizational assets and ensure regulatory compliance.',
  scope:
    'This policy applies to all employees, contractors, and third parties with access to organizational resources.',

  // Password Management defaults - EXACTLY matching template placeholders
  min_password_length: '12',
  complexity_requirements: 'uppercase letters, lowercase letters, numbers, and special characters',
  password_rotation_days: '90',
  password_history_count: '12',
  lockout_threshold: '5',
  lockout_duration_minutes: '15',
  mfa_required: 'is required for all privileged accounts and remote access',

  // Acceptable Use defaults
  monitoring_enabled: 'Yes',
  personal_use_allowed: 'Limited personal use permitted during breaks',
  social_media_policy: 'Professional use only during business hours',
  download_restrictions: 'No unauthorized software downloads',
  email_retention: '90 days',

  // Incident Response defaults
  incident_contact_email: 'security@yourorganization.com',
  incident_contact_phone: '(555) 123-HELP',
  escalation_timeframe: '2 hours for critical incidents',
  containment_timeframe: '4 hours',
  recovery_timeframe: '24 hours',
  law_enforcement_contact: 'Local FBI field office',

  // Mobile Device defaults
  device_encryption_required: 'Yes',
  remote_wipe_enabled: 'Yes',
  app_store_restrictions: 'Company-approved apps only',
  device_pin_required: 'Yes',
  auto_lock_timeout: '5 minutes',

  // Responsibilities
  it_department: 'IT Department',
  security_officer: 'Chief Information Security Officer',
  hr_department: 'Human Resources Department',
  management_approval: 'Executive Management',

  // Consequences
  consequences:
    'Violations may result in disciplinary action up to and including termination, and may also result in civil or criminal liability.',

  // References (common standards)
  references: 'NIST Cybersecurity Framework, ISO 27001, applicable federal and state regulations',

  // Revision tracking
  revision_history: `| Version | Date | Changes | Approved By |
|---------|------|---------|-------------|
| 1.0 | ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} | Initial policy creation | Management |`,
} as const;

/**
 * Reserved tokens that should never be prompted for
 * These are auto-generated or system-managed
 */
export const RESERVED_TOKENS = new Set([
  'policy_title',
  'today',
  'current_date',
  'intro',
  'purpose',
  'scope',
  'definitions',
  'statement',
  'procedures',
  'responsibilities',
  'consequences',
  'references',
  'revision_history',
]);

/**
 * Tokens that start with these prefixes are also reserved
 */
export const RESERVED_PREFIXES = ['auto_', 'sys_'];

/**
 * Checks if a token is reserved and should not be prompted for
 */
export function isReservedToken(token: string): boolean {
  if (RESERVED_TOKENS.has(token)) return true;
  return RESERVED_PREFIXES.some((prefix) => token.startsWith(prefix));
}

// Type for resolved defaults (after calling functions)
export type ResolvedDefaults = {
  [K in keyof typeof DEFAULTS]: (typeof DEFAULTS)[K] extends () => infer R
    ? R
    : (typeof DEFAULTS)[K];
};

export function resolveDefaults(): ResolvedDefaults {
  const resolved: any = {};
  for (const [key, value] of Object.entries(DEFAULTS)) {
    resolved[key] = typeof value === 'function' ? value() : value;
  }
  return resolved;
}

export const FRAMEWORK_TAGS = [
  'NIST',
  'ISO27001',
  'SOC2',
  'HIPAA',
  'GDPR',
  'PCI-DSS',
  'CMMC',
  'FedRAMP',
];

export const URGENCY_LEVELS = ['low', 'medium', 'high', 'critical'];

export const ESCALATION_REASONS = [
  'Technical complexity',
  'Compliance requirement',
  'Risk assessment needed',
  'Implementation guidance',
  'Audit preparation',
  'Training required',
];

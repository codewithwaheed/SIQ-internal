/**
 * Helper text for policy fields - shown in tooltips/popovers (≤120 chars each)
 */
export const FIELD_HELP: Record<string, string> = {
  // Password Management
  min_password_length: 'Minimum number of characters each password must contain (e.g., 12).',
  password_complexity:
    'Character types a password must include—uppercase, lowercase, number, special.',
  complexity_requirements:
    'Character types a password must include—uppercase, lowercase, number, special.',
  password_expiry_days: 'How often users must change their password before it expires.',
  password_rotation_days: 'How often users must change their password before it expires.',
  password_history_count: 'How many previous passwords are disallowed for reuse.',
  lockout_threshold: 'Number of failed log-ins before the account is locked.',
  lockout_duration_minutes: 'Length of time the account remains locked after too many failures.',
  lockout_duration: 'Length of time the account remains locked after too many failures.',
  mfa_required: 'Whether multi-factor authentication is mandatory for this system.',

  // Company Information
  company_name: "Your organization's full legal name for official documents.",
  company_email: 'Primary contact email for security-related matters.',
  company_address: "Physical address of your organization's headquarters.",
  organization_name: "Your organization's full legal name for official documents.",

  // Incident Response
  incident_contact_email:
    'Email address for reporting security incidents (e.g., security@company.com).',
  escalation_timeframe: 'How quickly incidents must be escalated to management (e.g., 2 hours).',
  incident_response_team: 'Names or roles of people responsible for handling security incidents.',
  initial_response_time: 'Maximum minutes allowed for initial incident response.',
  containment_time: 'Maximum hours to contain a security incident.',
  recovery_planning_time: 'Maximum hours to develop recovery plan after containment.',
  full_recovery_time: 'Maximum days expected for complete system recovery.',

  // Mobile Device
  device_encryption_required:
    'Whether all mobile devices accessing company data must be encrypted.',
  encryption_required: 'Whether all mobile devices accessing company data must be encrypted.',
  remote_wipe_enabled: 'Whether the organization can remotely wipe lost or stolen devices.',
  app_installation_policy: 'Rules about which apps can be installed on company devices.',
  device_types_allowed: 'Specific types of mobile devices permitted for business use.',
  app_store_policy: 'Restrictions on downloading apps from public app stores.',
  device_pin_required: 'Whether devices must use PIN, password, or biometric locks.',
  auto_lock_timeout: 'Minutes of inactivity before device automatically locks.',
  device_registration_required: 'Whether devices must be enrolled in mobile device management.',

  // Acceptable Use
  personal_use_allowed: 'Whether staff may use company IT for limited personal tasks.',
  personal_use_time_limit:
    'Enter minutes (e.g., 30) staff may use IT resources for personal tasks each day.',
  monitoring_enabled: 'Whether employee computer and network activities are monitored.',
  social_media_policy: 'Rules for using social media on company devices or time.',
  download_restrictions: 'Limitations on downloading software or files from the internet.',
  email_retention: 'How long email messages are kept before automatic deletion.',
  bandwidth_limit: 'Optional cap on non-business streaming or downloads (Mbps).',

  // Access Control
  access_review_frequency: 'How often user access rights are reviewed (quarterly, annually, etc.).',
  privileged_access_approval: 'Who must approve requests for administrative or elevated access.',
  guest_access_duration: 'Maximum time external users can have access to systems.',

  // Data Classification
  data_retention_period: 'How long different types of data must be kept before deletion.',
  backup_frequency: 'How often data backups are performed (daily, weekly, etc.).',
  encryption_standards: 'Specific encryption algorithms or standards required (AES-256, etc.).',
  classification_levels: 'Categories used to classify data sensitivity (Public, Internal, etc.).',
  retention_period_confidential: 'Years to retain confidential documents before deletion.',
  retention_period_internal: 'Years to retain internal documents before deletion.',
};

/**
 * Get helper text for a field, with fallback
 */
export function getFieldHelp(fieldKey: string): string {
  return FIELD_HELP[fieldKey] || 'Please provide a value for this setting.';
}

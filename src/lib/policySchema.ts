import { POLICY_DEFAULTS } from '@/config/defaults';
import { getFieldHelp } from '@/config/fieldHelp';

export type FieldSchema = {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select';
  help?: string;
  options?: Array<{ label: string; value: string }> | string[];
  placeholder?: string;
  default?: string | number | boolean;
};

/**
 * Minimal, pragmatic schema for key policy types.
 * This can be swapped later with an AI-provided schema, same shape.
 */
export function getPolicyFormSchema(
  policyType: string,
  frameworks?: string[],
): FieldSchema[] {
  const fw = (frameworks || []).map((f) => String(f));

  const baseOrgFields: FieldSchema[] = [
    {
      key: 'business_name',
      label: 'Organization Name',
      type: 'text',
      help: getFieldHelp('organization_name'),
      placeholder: 'Your Organization',
      default: POLICY_DEFAULTS.organization_name,
    },
  ];

  if (policyType === 'password_management') {
    return [
      ...baseOrgFields,
      {
        key: 'min_password_length',
        label: 'Minimum Password Length',
        type: 'select',
        options: ['12', '14', '16'],
        help: getFieldHelp('min_password_length'),
        default: POLICY_DEFAULTS.min_password_length,
        placeholder: '12',
      },
      {
        key: 'complexity_requirements',
        label: 'Complexity Requirements',
        type: 'select',
        options: [
          'uppercase, lowercase, numbers',
          'uppercase, lowercase, numbers, special characters',
          String(POLICY_DEFAULTS.complexity_requirements),
        ],
        help: getFieldHelp('complexity_requirements'),
        default: POLICY_DEFAULTS.complexity_requirements,
      },
      {
        key: 'password_rotation_days',
        label: 'Password Rotation (days)',
        type: 'select',
        options: ['60', '90', '180'],
        help: getFieldHelp('password_rotation_days'),
        default: POLICY_DEFAULTS.password_rotation_days,
      },
      {
        key: 'mfa_required',
        label: 'MFA Requirement',
        type: 'select',
        options: [
          'Required for privileged accounts and remote access',
          'Required for all accounts',
          'Recommended for all accounts',
          String(POLICY_DEFAULTS.mfa_required),
        ],
        help: getFieldHelp('mfa_required'),
        default: POLICY_DEFAULTS.mfa_required,
      },
    ];
  }

  if (policyType === 'acceptable_use') {
    return [
      ...baseOrgFields,
      {
        key: 'monitoring_enabled',
        label: 'Monitoring Enabled',
        type: 'select',
        options: ['Yes', 'No'],
        help: getFieldHelp('monitoring_enabled'),
        default: POLICY_DEFAULTS.monitoring_enabled,
      },
      {
        key: 'personal_use_allowed',
        label: 'Personal Use',
        type: 'select',
        options: [
          'No personal use',
          'Limited personal use permitted during breaks',
          String(POLICY_DEFAULTS.personal_use_allowed),
        ],
        help: getFieldHelp('personal_use_allowed'),
        default: POLICY_DEFAULTS.personal_use_allowed,
      },
      {
        key: 'download_restrictions',
        label: 'Download Restrictions',
        type: 'text',
        help: getFieldHelp('download_restrictions'),
        default: POLICY_DEFAULTS.download_restrictions,
        placeholder: 'No unauthorized software downloads',
      },
    ];
  }

  if (policyType === 'incident_response') {
    return [
      ...baseOrgFields,
      {
        key: 'incident_contact_email',
        label: 'Incident Contact Email',
        type: 'text',
        help: getFieldHelp('incident_contact_email'),
        default: POLICY_DEFAULTS.incident_contact_email,
        placeholder: 'security@yourorganization.com',
      },
      {
        key: 'initial_response_time',
        label: 'Initial Response (minutes)',
        type: 'select',
        options: ['15', '30', '60'],
        help: getFieldHelp('initial_response_time'),
        default: POLICY_DEFAULTS.initial_response_time,
      },
      {
        key: 'escalation_timeframe',
        label: 'Escalation Timeframe',
        type: 'text',
        help: getFieldHelp('escalation_timeframe'),
        default: POLICY_DEFAULTS.escalation_timeframe,
        placeholder: '2 hours for critical incidents',
      },
    ];
  }

  if (policyType === 'mobile_device') {
    return [
      ...baseOrgFields,
      {
        key: 'device_encryption_required',
        label: 'Device Encryption Required',
        type: 'select',
        options: ['Yes', 'No'],
        help: getFieldHelp('device_encryption_required'),
        default: POLICY_DEFAULTS.device_encryption_required,
      },
      {
        key: 'remote_wipe_enabled',
        label: 'Remote Wipe Enabled',
        type: 'select',
        options: ['Yes', 'No'],
        help: getFieldHelp('remote_wipe_enabled'),
        default: POLICY_DEFAULTS.remote_wipe_enabled,
      },
      {
        key: 'auto_lock_timeout',
        label: 'Auto-lock Timeout (minutes)',
        type: 'select',
        options: ['2', '5', '10'],
        help: getFieldHelp('auto_lock_timeout'),
        default: POLICY_DEFAULTS.auto_lock_timeout,
      },
    ];
  }

  // Generic
  return [
    ...baseOrgFields,
    {
      key: 'purpose',
      label: 'Purpose',
      type: 'text',
      help: 'Primary objective of this policy.',
      default: POLICY_DEFAULTS.purpose,
    },
    {
      key: 'scope',
      label: 'Scope',
      type: 'text',
      help: 'Who and what this policy applies to.',
      default: POLICY_DEFAULTS.scope,
    },
  ];
}


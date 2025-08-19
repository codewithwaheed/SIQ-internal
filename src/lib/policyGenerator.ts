import {
  findMissingPlaceholders,
  groupMissingFields,
  humanizeFieldName,
} from './placeholderScanner';
import { buildContext, fillTemplate, resolveFieldValue } from './fillTemplate';
import { POLICY_SLUG_MAP, findPolicySlug, type PolicySlug } from '@/config/policySlugMap';
import { POLICY_DEFAULTS, isReservedToken } from '@/config/defaults';

// Available policy templates
export const POLICY_TEMPLATES = {
  password_management: {
    file: 'password_management.md',
    title: 'Password Management Policy',
    description: 'Establishes requirements for creating and managing secure passwords',
  },
  acceptable_use: {
    file: 'acceptable_use.md',
    title: 'Acceptable Use Policy',
    description: 'Defines appropriate use of company IT resources and equipment',
  },
  incident_response: {
    file: 'incident_response.md',
    title: 'Incident Response Policy',
    description: 'Procedures for detecting and responding to cybersecurity incidents',
  },
  mobile_device: {
    file: 'mobile_device.md',
    title: 'Mobile Device Management Policy',
    description: 'Security requirements for mobile devices accessing company resources',
  },
  generic_template: {
    file: 'generic_template.md',
    title: 'Generic Policy Template',
    description: 'Universal policy template for any policy type',
  },
} as const;

export type PolicyType = keyof typeof POLICY_TEMPLATES;

/**
 * v2.0 Intent Detection - Three levels: none | unspecified | specified
 */
export function detectPolicyIntent(text: string): 'none' | 'unspecified' | 'specified' {
  const normalizedText = text.toLowerCase().trim();

  // Must contain a policy-related word AND a creation verb
  const hasPolicyWord = /\b(policy|procedure|standard|guideline|document)\b/i.test(normalizedText);
  const hasCreationVerb = /\b(create|draft|generate|make|build|write|produce|develop)\b/i.test(
    normalizedText,
  );

  // Must have BOTH policy word AND creation verb to trigger policy flow
  if (!hasPolicyWord || !hasCreationVerb) return 'none';

  // Check if specific policy type is mentioned
  const hasType = findPolicySlug(normalizedText) !== null;

  return hasType ? 'specified' : 'unspecified';
}

/**
 * Loads a policy template from the templates directory
 */
export async function loadPolicyTemplate(policyType: PolicyType): Promise<string> {
  try {
    console.log('[DEBUG] Loading policy template:', policyType);
    const templateInfo = POLICY_TEMPLATES[policyType];

    // Import the template content dynamically
    let templateContent: string;

    switch (policyType) {
      case 'password_management':
        const passwordModule = await import('/src/templates/password_management.md?raw');
        templateContent = passwordModule.default;
        break;
      case 'acceptable_use':
        const acceptableUseModule = await import('/src/templates/acceptable_use.md?raw');
        templateContent = acceptableUseModule.default;
        break;
      case 'incident_response':
        const incidentModule = await import('/src/templates/incident_response.md?raw');
        templateContent = incidentModule.default;
        break;
      case 'mobile_device':
        const mobileModule = await import('/src/templates/mobile_device.md?raw');
        templateContent = mobileModule.default;
        break;
      case 'generic_template':
        const genericModule = await import('/src/templates/generic_template.md?raw');
        templateContent = genericModule.default;
        break;
      default:
        throw new Error(`Unknown policy type: ${policyType}`);
    }

    console.log('[DEBUG] Template loaded successfully, length:', templateContent.length);
    return templateContent;
  } catch (error) {
    console.error(`Error loading policy template ${policyType}:`, error);
    throw new Error(`Unable to load policy template. Please try again.`);
  }
}

/**
 * v2.0 Enhanced Analyzer - excludes reserved tokens from prompting
 */
export async function analyzePolicyRequirements(
  template: string,
  userProfile: Record<string, any> = {},
  conversationAnswers: Record<string, any> = {},
): Promise<{
  missingFields: string[];
  fieldGroups: string[][];
  totalFields: number;
  completionPercentage: number;
}> {
  const context = buildContext({}, userProfile, conversationAnswers, true); // Exclude defaults for missing detection
  const allMissingFields = await findMissingPlaceholders(template, context);

  // Filter out reserved tokens
  const missingFields = allMissingFields.filter((field) => !isReservedToken(field));
  const fieldGroups = groupMissingFields(missingFields);

  // Calculate completion percentage based on non-reserved fields only
  const totalPlaceholders = Array.from(
    new Set(
      (template.match(/\{\{([a-z0-9_]+)\}\}/gi) || []).map((match) => match.replace(/[{}]/g, '')),
    ),
  ).filter((field) => !isReservedToken(field));

  const completedFields = totalPlaceholders.length - missingFields.length;
  const completionPercentage =
    totalPlaceholders.length > 0
      ? Math.round((completedFields / totalPlaceholders.length) * 100)
      : 100;

  return {
    missingFields,
    fieldGroups,
    totalFields: totalPlaceholders.length,
    completionPercentage,
  };
}

/**
 * Creates user-friendly prompt for collecting missing fields
 */
export function createFieldPrompt(
  policyType: PolicyType,
  fields: string[],
  isFirstGroup: boolean = false,
): string {
  const policyTitle = POLICY_TEMPLATES[policyType].title;
  const humanizedFields = fields.map((field) => ({
    key: field,
    label: humanizeFieldName(field),
  }));

  const fieldList = humanizedFields.map((field) => `• ${field.label}`).join('\n');

  const prefix = isFirstGroup
    ? `To tailor your ${policyTitle}, I need a few details:`
    : `Just a few more details for your ${policyTitle}:`;

  return `${prefix}

${fieldList}

Please provide the values, or tap "Use Defaults" to use our recommended settings.`;
}

/**
 * Processes user answers and updates conversation context
 */
export function processUserAnswers(
  answers: string,
  expectedFields: string[],
): Record<string, string> {
  const processedAnswers: Record<string, string> = {};

  // Handle "use defaults" case
  if (answers.toLowerCase().includes('default')) {
    return {}; // Will use defaults during template filling
  }

  // Parse comma-separated or line-separated answers
  const answerList = answers
    .split(/[,\n]/)
    .map((answer) => answer.trim())
    .filter((answer) => answer.length > 0);

  // Map answers to fields in order
  expectedFields.forEach((field, index) => {
    if (answerList[index]) {
      processedAnswers[field] = answerList[index];
    }
  });

  return processedAnswers;
}

/**
 * Generates the final policy document
 */
export function generatePolicy(
  template: string,
  userProfile: Record<string, any> = {},
  conversationAnswers: Record<string, any> = {},
): {
  policy: string;
  isComplete: boolean;
  missingFields: string[];
} {
  const context = buildContext({}, userProfile, conversationAnswers);
  const filledPolicy = fillTemplate(template, {}, userProfile, conversationAnswers);

  // Check for any remaining placeholders
  const remainingPlaceholders = Array.from(
    new Set(
      (filledPolicy.match(/\{\{([a-z0-9_]+)\}\}/gi) || []).map((match) =>
        match.replace(/[{}]/g, ''),
      ),
    ),
  );

  return {
    policy: filledPolicy,
    isComplete: remainingPlaceholders.length === 0,
    missingFields: remainingPlaceholders,
  };
}

/**
 * Gets available policy types for user selection
 */
export function getAvailablePolicies(): Array<{
  key: PolicyType;
  title: string;
  description: string;
}> {
  return Object.entries(POLICY_TEMPLATES).map(([key, info]) => ({
    key: key as PolicyType,
    title: info.title,
    description: info.description,
  }));
}

/**
 * v2.0 Policy Type Discovery - maps user input to policy slug with fallback
 */
export function getPolicyTypeFromInput(userInput: string): {
  type: PolicyType;
  title: string;
} {
  const slug = findPolicySlug(userInput);

  if (slug && slug in POLICY_TEMPLATES) {
    return {
      type: slug as PolicyType,
      title: POLICY_TEMPLATES[slug as PolicyType].title,
    };
  }

  // Fallback: extract policy title from user input and use generic template
  const extractedTitle = extractPolicyTitle(userInput);
  return { type: 'generic_template', title: extractedTitle };
}

/**
 * Extracts policy title from user input for unknown policy types
 */
function extractPolicyTitle(userInput: string): string {
  const normalized = userInput.toLowerCase().trim();

  // Remove common phrases to isolate policy name
  let title = normalized
    .replace(
      /^(create|generate|make|build|draft|write|produce|need|want|help.*draft|help.*create)\s+/i,
      '',
    )
    .replace(/\b(policy|procedure|standard|guideline)\b/i, '')
    .replace(/\b(for\s+(us|me|our\s+company))\b/i, '')
    .trim();

  // If nothing meaningful remains, use generic title
  if (!title || title.length < 3) {
    title = 'organizational policy';
  }

  // Capitalize first letter of each word
  return (
    title
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') + ' Policy'
  );
}

import { POLICY_DEFAULTS } from '@/config/defaults';
import { formatValue, formatBoolean } from './valueFormatter';

/**
 * Fills template placeholders with values from context, workspace profile, and defaults
 */
export function fillTemplate(
  template: string,
  userContext: Record<string, any> = {},
  workspaceProfile: Record<string, any> = {},
  conversationAnswers: Record<string, any> = {},
): string {
  // Input validation
  if (!template || typeof template !== 'string') {
    console.error('Invalid template provided to fillTemplate');
    return '';
  }

  try {
    return template.replace(/\{\{([a-z0-9_]+)\}\}/gi, (match, fieldName) => {
      // Priority order: conversation answers > user context > workspace profile > policy defaults
      const value =
        conversationAnswers[fieldName] ??
        userContext[fieldName] ??
        workspaceProfile[fieldName] ??
        POLICY_DEFAULTS[fieldName as keyof typeof POLICY_DEFAULTS] ??
        '';

      if (value !== undefined && value !== null && value !== '') {
        try {
          // Apply smart formatting with units
          return formatValue(fieldName, value);
        } catch (formatError) {
          console.warn(`Error formatting value for ${fieldName}:`, formatError);
          return String(value); // Fallback to raw value
        }
      }

      // For critical missing values, return the match to keep debugging info
      console.warn(`Missing value for placeholder: ${fieldName}`);
      return `[${fieldName}]`; // Show what's missing instead of keeping template syntax
    });
  } catch (error) {
    console.error('Error in fillTemplate:', error);
    return template; // Return original template if processing fails
  }
}

/**
 * Creates a complete context object by merging all available sources
 * excludeDefaults: when true, only includes user-provided values (for missing field detection)
 */
export function buildContext(
  userContext: Record<string, any> = {},
  workspaceProfile: Record<string, any> = {},
  conversationAnswers: Record<string, any> = {},
  excludeDefaults: boolean = false,
): Record<string, any> {
  const context = {
    ...userContext,
    ...workspaceProfile,
    ...conversationAnswers,
  };

  if (!excludeDefaults) {
    // Add policy defaults for any missing values
    Object.entries(POLICY_DEFAULTS).forEach(([key, value]) => {
      if (context[key] === undefined || context[key] === null || context[key] === '') {
        context[key] = value;
      }
    });
  }

  return context;
}

/**
 * Resolves a single field value using the priority chain
 */
export function resolveFieldValue(
  fieldName: string,
  userContext: Record<string, any> = {},
  workspaceProfile: Record<string, any> = {},
  conversationAnswers: Record<string, any> = {},
): string {
  const value =
    conversationAnswers[fieldName] ??
    userContext[fieldName] ??
    workspaceProfile[fieldName] ??
    POLICY_DEFAULTS[fieldName as keyof typeof POLICY_DEFAULTS] ??
    '';

  return String(value);
}

/**
 * Gets default value for a specific field
 */
export function getDefaultValue(fieldName: string): string {
  return String(POLICY_DEFAULTS[fieldName as keyof typeof POLICY_DEFAULTS] ?? '');
}

/**
 * Validates that all required placeholders have been filled
 */
export function validateTemplateCompletion(filledTemplate: string): {
  isComplete: boolean;
  remainingPlaceholders: string[];
} {
  const placeholderMatches = filledTemplate.match(/\{\{([a-z0-9_]+)\}\}/gi) || [];
  const remainingPlaceholders = placeholderMatches.map((match) => match.replace(/[{}]/g, ''));

  return {
    isComplete: remainingPlaceholders.length === 0,
    remainingPlaceholders,
  };
}

/**
 * Preview template with current context (useful for UI previews)
 */
export function previewTemplate(
  template: string,
  context: Record<string, any>,
): {
  preview: string;
  missingFields: string[];
  completionPercentage: number;
} {
  const allPlaceholders = Array.from(
    new Set(
      (template.match(/\{\{([a-z0-9_]+)\}\}/gi) || []).map((match) => match.replace(/[{}]/g, '')),
    ),
  );

  const filledFields = allPlaceholders.filter(
    (field) => context[field] !== undefined && context[field] !== null && context[field] !== '',
  );

  const missingFields = allPlaceholders.filter(
    (field) => context[field] === undefined || context[field] === null || context[field] === '',
  );

  const completionPercentage =
    allPlaceholders.length > 0
      ? Math.round((filledFields.length / allPlaceholders.length) * 100)
      : 100;

  const preview = fillTemplate(template, {}, {}, context);

  return {
    preview,
    missingFields,
    completionPercentage,
  };
}

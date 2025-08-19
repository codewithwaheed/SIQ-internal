const PLACEHOLDER_REGEX = /\{\{([a-z0-9_]+)\}\}/gi;

/**
 * Finds all placeholder tokens in a template string
 */
export function findPlaceholders(template: string): string[] {
  const placeholders = new Set<string>();
  let match;

  // Reset regex to ensure we find all matches
  PLACEHOLDER_REGEX.lastIndex = 0;

  while ((match = PLACEHOLDER_REGEX.exec(template)) !== null) {
    placeholders.add(match[1]);
  }

  return Array.from(placeholders);
}

/**
 * Finds missing placeholders that don't have values in the context
 * v2.0: Optionally excludes reserved tokens
 */
export async function findMissingPlaceholders(
  template: string,
  context: Record<string, any>,
  excludeReserved: boolean = false,
): Promise<string[]> {
  const allPlaceholders = findPlaceholders(template);
  let filteredPlaceholders = allPlaceholders;

  // Filter out reserved tokens if requested
  if (excludeReserved) {
    // Dynamic import to avoid circular dependency
    const { isReservedToken } = await import('@/config/defaults');
    filteredPlaceholders = allPlaceholders.filter((placeholder) => !isReservedToken(placeholder));
  }

  return filteredPlaceholders.filter(
    (placeholder) =>
      context[placeholder] === undefined ||
      context[placeholder] === null ||
      context[placeholder] === '',
  );
}

/**
 * Groups missing placeholders by priority for progressive disclosure
 * Returns arrays of max 3 fields each
 */
export function groupMissingFields(missingFields: string[]): string[][] {
  const groups: string[][] = [];
  const maxPerGroup = 3;

  for (let i = 0; i < missingFields.length; i += maxPerGroup) {
    groups.push(missingFields.slice(i, i + maxPerGroup));
  }

  return groups;
}

/**
 * Creates human-readable field names from placeholder tokens
 */
export function humanizeFieldName(fieldName: string): string {
  return fieldName
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Validates that a template follows the universal heading structure
 */
export function validateTemplateStructure(template: string): {
  isValid: boolean;
  missingHeadings: string[];
  extraHeadings: string[];
} {
  const requiredHeadings = [
    'Introduction',
    'Purpose',
    'Scope',
    'Definitions',
    'Policy Statement',
    'Procedures',
    'Responsibilities',
    'Consequences of Non-Compliance',
    'References',
    'Revision History',
  ];

  const headingRegex = /^\*\*([^*]+)\*\*\s*$/gm;
  const foundHeadings = [];
  let match;

  while ((match = headingRegex.exec(template)) !== null) {
    foundHeadings.push(match[1].trim());
  }

  const missingHeadings = requiredHeadings.filter((h) => !foundHeadings.includes(h));
  const extraHeadings = foundHeadings.filter((h) => !requiredHeadings.includes(h));

  return {
    isValid: missingHeadings.length === 0,
    missingHeadings,
    extraHeadings,
  };
}

/**
 * Bank of explanatory prose for padding short policy sections
 */
export const POLICY_PADDING = {
  purpose: [
    'This comprehensive approach ensures organizational resilience and regulatory compliance.',
    'The policy framework supports business continuity while maintaining security standards.',
    'Regular review and updates ensure continued effectiveness and alignment with industry best practices.',
    'Implementation of these guidelines protects both organizational assets and stakeholder interests.',
  ],

  policy: [
    'These requirements reflect current industry standards and regulatory expectations.',
    'Compliance with these provisions ensures consistent security posture across all organizational operations.',
    'The policy framework provides clear guidance while allowing for reasonable operational flexibility.',
    'Regular monitoring and assessment activities verify ongoing adherence to established standards.',
  ],

  procedures: [
    'These operational procedures translate policy requirements into actionable steps for daily implementation.',
    'Documentation and record-keeping support audit requirements and continuous improvement efforts.',
    'Training and awareness programs ensure all personnel understand their roles and responsibilities.',
    'Regular review cycles maintain procedure relevance and effectiveness over time.',
  ],

  responsibilities: [
    'Clear role definition ensures accountability and prevents gaps in security coverage.',
    'Cross-functional coordination supports effective implementation across all organizational areas.',
    'Regular communication and reporting maintain visibility into compliance status.',
    'Escalation procedures ensure prompt resolution of issues and concerns.',
  ],

  generic: [
    'This framework ensures consistent application of standards across all organizational activities.',
    'Regular assessment and improvement cycles maintain policy effectiveness and relevance.',
    'Documentation requirements support accountability and continuous improvement efforts.',
    'Training and awareness programs ensure all stakeholders understand their obligations.',
  ],
};

/**
 * Adds explanatory prose to short sections
 */
export function padSection(
  content: string,
  sectionType: keyof typeof POLICY_PADDING = 'generic',
): string {
  const wordCount = content.split(/\s+/).length;

  if (wordCount >= 100) {
    return content; // Already long enough
  }

  const padding = POLICY_PADDING[sectionType] || POLICY_PADDING.generic;
  const needed = Math.ceil((100 - wordCount) / 15); // Roughly 15 words per sentence
  const selectedPadding = padding.slice(0, Math.min(needed, padding.length));

  return content + '\n\n' + selectedPadding.join(' ');
}

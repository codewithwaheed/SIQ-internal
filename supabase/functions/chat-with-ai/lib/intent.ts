export type Intent = 'doc_summary' | 'qa' | 'compare' | 'no_context';

const SUMMARY_TERMS = [
  'summary',
  'summarize',
  'summarise',
  'tl;dr',
  'overview',
  'key points',
  'analyze',
  'analyse',
  'high level',
  'brief',
];

const COMPARE_TERMS = ['compare', 'difference', 'differences', 'vs', 'versus', 'contrast'];

export function classifyIntent(userText: string, attachedDocCount: number): Intent {
  const q = (userText || '').toLowerCase();
  const hasSummaryCue = SUMMARY_TERMS.some((t) => q.includes(t));
  const hasCompareCue = COMPARE_TERMS.some((t) => q.includes(t));

  if (attachedDocCount >= 2 && hasCompareCue) return 'compare';
  if (attachedDocCount >= 1 && hasSummaryCue) return 'doc_summary';

  if (attachedDocCount === 0 && !hasSummaryCue && !hasCompareCue) return 'no_context';
  return 'qa';
}


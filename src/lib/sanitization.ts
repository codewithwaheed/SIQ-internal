import DOMPurify from 'dompurify';
import { marked } from 'marked';

/**
 * Secure content sanitization utilities to prevent XSS attacks
 */

// Configure DOMPurify with strict settings
const purifyConfig = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'code', 'pre', 'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
  ],
  ALLOWED_ATTR: ['href', 'title', 'target'],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'iframe'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur']
};

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param html - Raw HTML content
 * @returns Sanitized HTML safe for rendering
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }
  
  return DOMPurify.sanitize(html, purifyConfig);
}

/**
 * Safely render markdown content with XSS protection
 * @param markdown - Markdown content
 * @returns Sanitized HTML from markdown
 */
export function renderSafeMarkdown(markdown: string): string {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }

  // Configure marked for security
  marked.setOptions({
    breaks: true,
    gfm: true,
    silent: true // Don't throw on malformed input
  });

  try {
    const rawHtml = marked.parse(markdown);
    return sanitizeHtml(rawHtml as string);
  } catch (error) {
    console.error('Markdown parsing error:', error);
    // Fallback to escaped text
    return DOMPurify.sanitize(markdown, { ALLOWED_TAGS: [] });
  }
}

/**
 * Sanitize text content - strips all HTML
 * @param text - Text content that may contain HTML
 * @returns Plain text with HTML removed
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
}

/**
 * Sanitize policy content for safe display
 * @param content - Policy content (may contain HTML)
 * @returns Sanitized content safe for rendering
 */
export function sanitizePolicyContent(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  // Allow additional formatting tags for policy content
  const policyConfig = {
    ...purifyConfig,
    ALLOWED_TAGS: [
      ...purifyConfig.ALLOWED_TAGS,
      'div', 'span', 'section', 'article'
    ],
    ALLOWED_ATTR: [
      ...purifyConfig.ALLOWED_ATTR,
      'class', 'id'
    ]
  };

  return DOMPurify.sanitize(content, policyConfig);
}

/**
 * Create a safe React component content renderer
 * @param content - Content to render
 * @param type - Type of content ('markdown' | 'html' | 'text')
 * @returns Object with __html property for dangerouslySetInnerHTML
 */
export function createSafeHtml(content: string, type: 'markdown' | 'html' | 'text' = 'html') {
  let sanitizedContent: string;
  
  switch (type) {
    case 'markdown':
      sanitizedContent = renderSafeMarkdown(content);
      break;
    case 'text':
      sanitizedContent = sanitizeText(content);
      break;
    case 'html':
    default:
      sanitizedContent = sanitizeHtml(content);
      break;
  }
  
  return { __html: sanitizedContent };
}
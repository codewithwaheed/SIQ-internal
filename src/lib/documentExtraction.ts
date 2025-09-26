export interface ExtractionQuality {
  alpha_ratio: number;
  unique_ratio: number;
  empty_cell_tokens: number;
  length: number;
}

export interface DocumentExtractionResult {
  text: string;
  pages: string[];
  quality: ExtractionQuality;
}

const MAX_TEXT_LENGTH = 50_000;

const sanitizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

const clampPages = (pages: string[]) => {
  const limited: string[] = [];
  let total = 0;
  for (const page of pages) {
    if (total >= MAX_TEXT_LENGTH) break;
    const remaining = MAX_TEXT_LENGTH - total;
    const trimmed = page.slice(0, remaining);
    if (!trimmed) continue;
    limited.push(trimmed);
    total += trimmed.length;
  }
  return limited;
};

const buildQuality = (text: string): ExtractionQuality => {
  const totalLen = text.length;
  const alphaOnly = text.replace(/[^A-Za-z]/g, '');
  const alphaRatio = totalLen > 0 ? alphaOnly.length / totalLen : 0;
  const tokens = text.toLowerCase().split(/\s+/).filter(Boolean);
  const uniqueTokens = new Set(tokens);
  const uniqueRatio = tokens.length > 0 ? uniqueTokens.size / tokens.length : 0;
  const emptyCellCount = (text.match(/empty cell/gi) || []).length;

  return {
    alpha_ratio: Number(alphaRatio.toFixed(3)),
    unique_ratio: Number(uniqueRatio.toFixed(3)),
    empty_cell_tokens: emptyCellCount,
    length: totalLen,
  };
};

const extractPdfText = async (file: File): Promise<string[] | null> => {
  const { extractText, getDocumentProxy } = await import('unpdf');
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await getDocumentProxy(data, {
    isEvalSupported: false,
    useSystemFonts: true,
  });
  const { text: pages } = await extractText(pdf, { mergePages: false });

  if (!Array.isArray(pages) || pages.length === 0) {
    return null;
  }

  return pages
    .map((page) =>
      sanitizeWhitespace(page || '')
        .replace(/\b(Text Box|Empty cell|Figure|Table)\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter((page) => page.length > 0);
};

const extractDocxText = async (file: File): Promise<string[] | null> => {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const documentFile = zip.file('word/document.xml');

  if (!documentFile) {
    return null;
  }

  const xmlContent = await documentFile.async('string');
  const pageBreakRegex = /<w:br[^>]*w:type="page"[^>]*\/?>/gi;
  const sections = xmlContent
    .split(/<w:sectPr[^>]*>[\s\S]*?<\/w:sectPr>/gi)
    .flatMap((section) => section.split(pageBreakRegex));

  const pages: string[] = [];
  const textRegex = /<w:t[^>]*>(.*?)<\/w:t>/g;

  sections.forEach((section) => {
    const matches = section.matchAll(textRegex);
    const fragments: string[] = [];
    for (const match of matches) {
      const raw = match[1] ?? '';
      const cleaned = raw
        .replace(/<.*?>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
        .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(String(code), 16)));
      const trimmed = sanitizeWhitespace(cleaned);
      if (trimmed) fragments.push(trimmed);
    }
    if (fragments.length > 0) {
      pages.push(fragments.join(' '));
    }
  });

  if (pages.length === 0) {
    return null;
  }

  return pages;
};

export async function extractTextFromFile(
  file: File,
): Promise<DocumentExtractionResult | null> {
  try {
    let pages: string[] | null = null;

    if (file.type === 'text/plain') {
      const raw = await file.text();
      const sanitized = sanitizeWhitespace(raw);
      pages = sanitized ? [sanitized] : null;
    } else if (file.type === 'application/pdf') {
      pages = await extractPdfText(file);
    } else if (
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      pages = await extractDocxText(file);
    }

    if (!pages || pages.length === 0) {
      return null;
    }

    const sanitizedPages = pages.map(sanitizeWhitespace).filter(Boolean);
    if (sanitizedPages.length === 0) {
      return null;
    }

    const limitedPages = clampPages(sanitizedPages);

    const text = limitedPages
      .map((page, idx) => `--- Page ${idx + 1} ---\n${page}`)
      .join('\n\n');
    if (!text) {
      return null;
    }

    return {
      text,
      pages: limitedPages,
      quality: buildQuality(text),
    };
  } catch (error) {
    console.warn('Client-side extraction failed:', error);
    return null;
  }
}

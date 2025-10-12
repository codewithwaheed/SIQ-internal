import { marked } from 'marked';

type Block =
  | { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'hr' };

function normalizeMarkdown(md: string): string {
  if (!md) return '';
  try {
    let out = md.replace(/\u0000/g, '').replace(/\r\n?/g, '\n').trim();
    // Ensure '#Heading' becomes '# Heading'
    out = out
      .split('\n')
      .map((line) => (/^#{1,6}[^#\s]/.test(line) ? line.replace(/^(#{1,6})(.*)$/, (_, h, t) => `${h} ${String(t).trim()}`) : line))
      .join('\n');
    // Insert a line break before headings that are jammed inline
    out = out.replace(/([^\n])\s*(#{1,6}\s+)/g, '$1\n\n$2');
    // Add a blank line after section headings when body follows immediately
    const headingTokens = '(Introduction|Purpose|Scope|Definitions(?:\s*\([^\)]*\))?|Policy\s+Statement|Procedures|Responsibilities|Consequences\s+of\s+Non-Compliance|References|Revision\s+History)';
    const reAfter = new RegExp(`^(#{1,6}\\s+${headingTokens})(?=\\S)`, 'gmi');
    out = out.replace(reAfter, '$1\n\n');
    // Convert bold-only lines to headings
    out = out
      .split('\n')
      .map((line) => {
        const m = line.match(/^\s*\*\*(.+?)\*\*\s*$/);
        return m ? `## ${m[1].trim()}` : line;
      })
      .join('\n');
    // Collapse excessive blank lines
    out = out.replace(/\n{3,}/g, '\n\n');
    return out;
  } catch {
    return md;
  }
}

function markdownToBlocks(md: string): Block[] {
  const src = normalizeMarkdown(md);
  const tokens = marked.lexer(src, { gfm: true, breaks: true });
  const blocks: Block[] = [];
  let listBuffer: { ordered: boolean; items: string[] } | null = null;

  const flushList = () => {
    if (!listBuffer) return;
    if (listBuffer.ordered) blocks.push({ type: 'ol', items: listBuffer.items });
    else blocks.push({ type: 'ul', items: listBuffer.items });
    listBuffer = null;
  };

  for (const t of tokens) {
    if (t.type === 'heading') {
      flushList();
      blocks.push({ type: 'heading', level: Math.min((t as any).depth || 1, 6) as any, text: (t as any).text || '' });
      continue;
    }
    if (t.type === 'list') {
      const ordered = (t as any).ordered === true;
      const items = ((t as any).items || []).map((i: any) => String(i.text || ''));
      // If previous buffer matches current type, append; else flush and start new
      if (listBuffer && listBuffer.ordered === ordered) {
        listBuffer.items.push(...items);
      } else {
        flushList();
        listBuffer = { ordered, items: [...items] };
      }
      continue;
    }
    if (t.type === 'hr') {
      flushList();
      blocks.push({ type: 'hr' });
      continue;
    }
    if (t.type === 'paragraph' || t.type === 'text') {
      flushList();
      blocks.push({ type: 'paragraph', text: (t as any).text || '' });
      continue;
    }
    // Ignore other token types for now
  }
  flushList();
  return blocks;
}

function safeFilename(baseTitle: string, ext: string): string {
  const base = (baseTitle || 'policy')
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
  const date = new Date().toISOString().split('T')[0];
  return `${base || 'policy'}_${date}.${ext}`;
}

export async function exportPolicyToPDF(title: string, markdown: string): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });

  // Page metrics
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const marginTop = 54; // 0.75in
  const marginBottom = 60; // ensure footer/bottom margin
  const marginHoriz = 54; // 0.75in
  const contentWidth = pageWidth - marginHoriz * 2;

  // Base styles
  // Use Helvetica for a cleaner, modern look. Available in jsPDF core fonts.
  pdf.setFont('helvetica', 'normal');
  const baseFontSize = 11.5;
  const lineGap = 4;

  let y = marginTop;

  // Prepare blocks first so we can avoid double titles
  const blocks = markdownToBlocks(markdown);
  const firstIsH1 = blocks.length > 0 && blocks[0].type === 'heading' && (blocks[0] as any).level === 1;
  const firstH1Text = firstIsH1 ? (blocks[0] as any).text?.trim()?.toLowerCase() : '';
  const normalizedTitle = (title || '').trim().toLowerCase();
  const shouldRenderTitle = !!normalizedTitle && (!firstIsH1 || firstH1Text !== normalizedTitle);

  const moveToNextPage = () => {
    pdf.addPage();
    y = marginTop;
  };

  // Render title only if content doesn't already start with the same H1
  if (shouldRenderTitle) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    const titleLines = pdf.splitTextToSize(title.trim(), contentWidth);
    const titleHeight = titleLines.length * (18 + 2);
    if (y + titleHeight > pageHeight - marginBottom) moveToNextPage();
    titleLines.forEach((line: string, idx: number) => {
      pdf.text(line, marginHoriz, y + (idx === 0 ? 0 : idx * (18 + 2)));
    });
    y += titleHeight + 10;
  }

  const ensureRoom = (needed: number) => {
    if (y + needed > pageHeight - marginBottom) moveToNextPage();
  };

  const drawParagraph = (text: string) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(baseFontSize);
    const lines = pdf.splitTextToSize(text, contentWidth);
    for (const line of lines) {
      ensureRoom(baseFontSize + lineGap);
      pdf.text(line, marginHoriz, y);
      y += baseFontSize + lineGap;
    }
    y += 2;
  };

  const drawHeading = (level: number, text: string) => {
    const size = level === 1 ? 16 : level === 2 ? 14 : level === 3 ? 13 : 12;
    const preSpace = level === 1 ? 8 : 6;
    const postSpace = 4;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(text, contentWidth);
    const blockHeight = preSpace + lines.length * (size + 2) + postSpace;
    // Widow/orphan: keep heading with at least two lines of following paragraph/list if possible
    ensureRoom(blockHeight + 2 * (baseFontSize + lineGap));
    y += preSpace;
    for (let i = 0; i < lines.length; i++) {
      pdf.text(lines[i], marginHoriz, y);
      y += size + 2;
    }
    y += postSpace;
  };

  const drawList = (items: string[], ordered: boolean) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(baseFontSize);
    const bulletIndent = 14;
    const numberIndent = 20;
    const left = marginHoriz + (ordered ? numberIndent : bulletIndent);
    const markerLeft = marginHoriz;

    // Try to avoid leaving a single list item at the bottom
    const measureItem = (t: string) => pdf.splitTextToSize(t, contentWidth - (ordered ? numberIndent : bulletIndent)).length * (baseFontSize + lineGap);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const lines = pdf.splitTextToSize(item, contentWidth - (ordered ? numberIndent : bulletIndent));
      const itemHeight = lines.length * (baseFontSize + lineGap) + 2;
      const nextItemHeight = i + 1 < items.length ? measureItem(items[i + 1]) : 0;

      // Keep at least two items together when near a break
      if (y + itemHeight + nextItemHeight > pageHeight - marginBottom) {
        moveToNextPage();
      }

      // Marker
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(baseFontSize);
      const marker = ordered ? `${i + 1}.` : '•';
      pdf.text(marker, markerLeft, y);

      // Content
      pdf.setFont('helvetica', 'normal');
      for (const line of lines) {
        ensureRoom(baseFontSize + lineGap);
        pdf.text(line, left, y);
        y += baseFontSize + lineGap;
      }
      y += 2;
    }
  };

  for (const b of blocks) {
    switch (b.type) {
      case 'heading':
        drawHeading(b.level, b.text);
        break;
      case 'paragraph': {
        // If paragraph begins with bold pseudo heading, avoid orphaning (handled by normalize)
        drawParagraph(b.text);
        break;
      }
      case 'ul':
        drawList(b.items, false);
        break;
      case 'ol':
        drawList(b.items, true);
        break;
      case 'hr':
        ensureRoom(10);
        pdf.setDrawColor(150);
        pdf.line(marginHoriz, y, marginHoriz + contentWidth, y);
        y += 10;
        break;
    }
  }

  const blob = pdf.output('blob');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = safeFilename(title || 'policy', 'pdf');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

export async function exportPolicyToDocx(title: string, markdown: string): Promise<void> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');
  const src = normalizeMarkdown(markdown);
  const tokens = marked.lexer(src, { gfm: true, breaks: true });
  const children: any[] = [];
  // Avoid double title: if first token is a heading level 1 matching the title, skip adding title
  const firstToken = tokens.find((t) => t.type === 'heading') as any | undefined;
  const firstIsH1 = firstToken && (firstToken.depth || 1) === 1;
  const normalizedTitle = (title || '').trim().toLowerCase();
  const firstH1Text = firstIsH1 ? String(firstToken.text || '').trim().toLowerCase() : '';
  const shouldRenderTitle = !!normalizedTitle && (!firstIsH1 || firstH1Text !== normalizedTitle);

  if (shouldRenderTitle) {
    children.push(new Paragraph({ text: (title || '').trim(), heading: HeadingLevel.HEADING_1 }));
  }

  for (const t of tokens) {
    if (t.type === 'heading') {
      const level = Math.min((t as any).depth || 1, 6);
      const text = (t as any).text || '';
      const hl = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6][level - 1];
      children.push(new Paragraph({ text, heading: hl }));
      continue;
    }
    if (t.type === 'list') {
      const ordered = (t as any).ordered === true;
      const items = ((t as any).items || []).map((i: any) => String(i.text || ''));
      for (const it of items) {
        if (ordered) children.push(new Paragraph(it));
        else children.push(new Paragraph({ text: it, bullet: { level: 0 } }));
      }
      continue;
    }
    if (t.type === 'paragraph' || t.type === 'text') {
      const line = (t as any).text || '';
      // Handle bold spans
      const parts: any[] = [];
      let rest = line;
      while (true) {
        const m = rest.match(/\*\*(.*?)\*\*/);
        if (!m) { parts.push(new TextRun(rest)); break; }
        const [full, inner] = m;
        const idx = rest.indexOf(full);
        if (idx > 0) parts.push(new TextRun(rest.slice(0, idx)));
        parts.push(new TextRun({ text: inner, bold: true }));
        rest = rest.slice(idx + full.length);
      }
      children.push(new Paragraph({ children: parts }));
      continue;
    }
  }

  const doc = new Document({ sections: [{ properties: {}, children }] });
  const blob = await Packer.toBlob(doc);

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = safeFilename(title || 'policy', 'docx');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

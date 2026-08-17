/**
 * Inline rendering for the Codex (MIS-085 B): the manual's markdown inline
 * marks become HTML, everything else is escaped. The source text is sacred
 * and arrives verbatim, so escaping comes FIRST and only whitelisted marks
 * are re-materialized afterwards: **bold**, _italic_, <u>, <sup>, <br>.
 */

function escapeHtml(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

/** One line of manual prose → safe inline HTML. */
export function renderInline(text: string): string {
  let html = escapeHtml(text);
  // Whitelisted literal tags from the PDF conversion, now escaped forms.
  html = html.replaceAll(/&lt;u&gt;(.*?)&lt;\/u&gt;/g, '<u>$1</u>');
  // Cell line breaks inside the manual's tables. Self-closed: the EPUB
  // edition reuses this output as XHTML.
  html = html.replaceAll(/&lt;br\s*\/?&gt;/g, '<br/>');
  html = html.replaceAll(
    /&lt;sup&gt;\s*(\d{1,3})\s*&lt;\/sup&gt;/g,
    '<sup class="nota-ref" data-nota="$1">$1</sup>',
  );
  // Markdown emphasis. Bold first so `**_x_**` nests correctly.
  html = html.replaceAll(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic: underscore pairs that do not sit inside a word.
  html = html.replaceAll(/(^|[\s(«‒–—>])_([^_]+)_(?=[\s)».,;:‒–—<!?]|$)/g, '$1<em>$2</em>');
  return html;
}

/** A fully italic-wrapped line (the manual's lectura/epigraph convention).
 * Quote marks and dashes may sit OUTSIDE the underscores in the source
 * («&nbsp;_La niebla…_»), so punctuation at the edges is ignored. */
export function isItalicLine(line: string): boolean {
  const core = line
    .trim()
    .replace(/^[«»‒–—\s]+/, '')
    .replace(/[«»‒–—.\s]+$/, '');
  return core.length > 1 && core.startsWith('_') && core.endsWith('_');
}

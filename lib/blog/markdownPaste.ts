import { marked } from "marked";

/**
 * ChatGPT's copy button (and many other tools) put Markdown on the clipboard as
 * plain text. When pasted text looks like Markdown, convert it to HTML so the
 * editor keeps the headings, lists, bold text and tables.
 */
export function looksLikeMarkdown(text: string) {
  const lines = text.split("\n");
  const tableRows = lines.filter((l) => /^\s*\|.*\|\s*$/.test(l)).length;
  const hasTableDivider = lines.some((l) => /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(l));
  if (tableRows >= 2 && hasTableDivider) return true;
  let signals = 0;
  if (lines.some((l) => /^#{1,6}\s+\S/.test(l))) signals++;
  if (lines.some((l) => /^\s*[-*+]\s+\S/.test(l))) signals++;
  if (lines.some((l) => /^\s*\d+\.\s+\S/.test(l))) signals++;
  if (/\*\*[^*\n]+\*\*/.test(text)) signals++;
  if (/\[[^\]\n]+\]\(https?:\/\/[^)\s]+\)/.test(text)) signals++;
  return signals >= 1 && (lines.length > 1 || /^#{1,6}\s/.test(text));
}

export function markdownToEditorHtml(text: string) {
  const html = marked.parse(text, { async: false, gfm: true, breaks: false }) as string;
  return html
    // The post title is the page's H1; body headings start at H2.
    .replace(/<(\/?)h1\b/gi, "<$1h2")
    .replace(/<(\/?)h[56]\b/gi, "<$1h4")
    // Remote images can't be used in posts (they must be uploaded), so drop them.
    .replace(/<img\b[^>]*>/gi, "");
}

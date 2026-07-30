/** Hand-rolled Markdown -> HTML converter covering the common GFM-lite
 * subset (headings, emphasis, inline code, links, images, lists,
 * blockquotes, fenced code blocks, horizontal rules, paragraphs).
 *
 * Deliberately does NOT sanitize its output — sanitization needs a real
 * DOM (DOMPurify requires `window`), which would violate the "transform.ts
 * has zero DOM dependency, must run in Workers/SSR/CLI" rule in
 * DEVELOPMENT_GUIDE.md §5. The ToolView (browser-only) is responsible for
 * calling DOMPurify.sanitize() on this output before rendering it, per
 * ARCHITECTURE.md §9. Never render this function's output directly. */
export function markdownToHtml(markdown: string): string {
  if (markdown.trim().length === 0) return "";

  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const htmlBlocks: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;

    if (line.trim().length === 0) {
      i++;
      continue;
    }

    // Fenced code block
    if (/^```/.test(line)) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i]!)) {
        codeLines.push(lines[i]!);
        i++;
      }
      i++; // skip closing fence
      const langAttr = lang ? ` class="language-${escapeHtml(lang)}"` : "";
      htmlBlocks.push(`<pre><code${langAttr}>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      htmlBlocks.push("<hr />");
      i++;
      continue;
    }

    // Heading
    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(line);
    if (headingMatch) {
      const level = headingMatch[1]!.length;
      htmlBlocks.push(`<h${level}>${inlineToHtml(headingMatch[2]!.trim())}</h${level}>`);
      i++;
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i]!)) {
        quoteLines.push(lines[i]!.replace(/^>\s?/, ""));
        i++;
      }
      htmlBlocks.push(`<blockquote>${markdownToHtml(quoteLines.join("\n"))}</blockquote>`);
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i]!)) {
        items.push(lines[i]!.replace(/^[-*]\s+/, ""));
        i++;
      }
      htmlBlocks.push(`<ul>${items.map((item) => `<li>${inlineToHtml(item)}</li>`).join("")}</ul>`);
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i]!)) {
        items.push(lines[i]!.replace(/^\d+\.\s+/, ""));
        i++;
      }
      htmlBlocks.push(`<ol>${items.map((item) => `<li>${inlineToHtml(item)}</li>`).join("")}</ol>`);
      continue;
    }

    // Paragraph (collect until blank line)
    const paraLines: string[] = [];
    while (i < lines.length && lines[i]!.trim().length > 0 && !isBlockStart(lines[i]!)) {
      paraLines.push(lines[i]!);
      i++;
    }
    htmlBlocks.push(`<p>${inlineToHtml(paraLines.join(" "))}</p>`);
  }

  return htmlBlocks.join("\n");
}

function isBlockStart(line: string): boolean {
  return (
    /^```/.test(line) ||
    /^(#{1,6})\s+/.test(line) ||
    /^>\s?/.test(line) ||
    /^[-*]\s+/.test(line) ||
    /^\d+\.\s+/.test(line) ||
    /^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())
  );
}

function inlineToHtml(text: string): string {
  let html = escapeHtml(text);

  // Images before links (image syntax is link syntax prefixed with !)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt: string, url: string) => `<img src="${url}" alt="${alt}" />`);
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label: string, url: string) => `<a href="${url}">${label}</a>`);

  // Inline code (before bold/italic so markers inside code aren't parsed)
  html = html.replace(/`([^`]+)`/g, (_m, code: string) => `<code>${code}</code>`);

  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/(?<![A-Za-z0-9])_([^_]+)_(?![A-Za-z0-9])/g, "<em>$1</em>");

  return html;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

import type { MarkdownHtmlOptions } from "./schema";


const DEFAULTS: MarkdownHtmlOptions = {
  gfm: true,
  headingIds: false,
  hardBreaks: false,
  externalLinks: false,
  safeUrls: true,
  fullDocument: false,
};

export function markdownToHtml(markdown: string, options: Partial<MarkdownHtmlOptions> = {}): string {
  const o: MarkdownHtmlOptions = { ...DEFAULTS, ...options };
  const body = renderBlocks(markdown, o, new Map());
  if (!o.fullDocument || body === "") return body;
  const title = /<h1[^>]*>(.*?)<\/h1>/.exec(body)?.[1]?.replace(/<[^>]+>/g, "") ?? "Document";
  return [
    "<!DOCTYPE html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<title>${title}</title>`,
    "<style>body{max-width:760px;margin:2rem auto;padding:0 1rem;font:16px/1.6 system-ui,sans-serif}pre{background:#f5f5f5;padding:1rem;overflow:auto}code{font-family:ui-monospace,monospace}table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:.3rem .6rem}blockquote{border-left:4px solid #ddd;margin:0;padding-left:1rem;color:#555}</style>",
    "</head>",
    "<body>",
    body,
    "</body>",
    "</html>",
  ].join("\n");
}

function slugify(text: string, used: Map<string, number>): string {
  const base =
    text
      .replace(/<[^>]+>/g, "")
      .replace(/&[a-z]+;|&#\d+;/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .replace(/\s/g, "-") || "section";
  const n = used.get(base) ?? 0;
  used.set(base, n + 1);
  return n === 0 ? base : `${base}-${n}`;
}

const TABLE_SEP = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/;

function splitRow(line: string): string[] {
  let t = line.trim();
  if (t.startsWith("|")) t = t.slice(1);
  if (t.endsWith("|") && !t.endsWith("\\|")) t = t.slice(0, -1);
  return t.split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, "|"));
}

function renderBlocks(markdown: string, o: MarkdownHtmlOptions, slugs: Map<string, number>): string {
  if (markdown.trim().length === 0) return "";
  const inline = (t: string) => inlineToHtml(t, o);

  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const htmlBlocks: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;

    if (line.trim().length === 0) {
      i++;
      continue;
    }

    if (/^```/.test(line)) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i]!)) {
        codeLines.push(lines[i]!);
        i++;
      }
      i++;
      const langAttr = lang ? ` class="language-${escapeHtml(lang)}"` : "";
      htmlBlocks.push(`<pre><code${langAttr}>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      htmlBlocks.push("<hr />");
      i++;
      continue;
    }

    if (o.gfm && line.includes("|") && i + 1 < lines.length && TABLE_SEP.test(lines[i + 1]!)) {
      const header = splitRow(line);
      const aligns = splitRow(lines[i + 1]!).map((c) =>
        c.startsWith(":") && c.endsWith(":") ? "center" : c.endsWith(":") ? "right" : c.startsWith(":") ? "left" : "",
      );
      const cell = (tag: string, text: string, k: number) =>
        `<${tag}${aligns[k] ? ` style="text-align:${aligns[k]}"` : ""}>${inline(text)}</${tag}>`;
      const rows: string[] = [];
      i += 2;
      while (i < lines.length && lines[i]!.trim() && lines[i]!.includes("|")) {
        const cells = splitRow(lines[i]!);
        rows.push(`<tr>${header.map((_, k) => cell("td", cells[k] ?? "", k)).join("")}</tr>`);
        i++;
      }
      const thead = `<thead><tr>${header.map((h, k) => cell("th", h, k)).join("")}</tr></thead>`;
      htmlBlocks.push(`<table>${thead}${rows.length ? `<tbody>${rows.join("")}</tbody>` : ""}</table>`);
      continue;
    }

    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(line);
    if (headingMatch) {
      const level = headingMatch[1]!.length;
      const content = inline(headingMatch[2]!.trim().replace(/\s+#+$/, ""));
      const id = o.headingIds ? ` id="${slugify(content, slugs)}"` : "";
      htmlBlocks.push(`<h${level}${id}>${content}</h${level}>`);
      i++;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i]!)) {
        quoteLines.push(lines[i]!.replace(/^>\s?/, ""));
        i++;
      }
      htmlBlocks.push(`<blockquote>${renderBlocks(quoteLines.join("\n"), o, slugs)}</blockquote>`);
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i]!)) {
        items.push(lines[i]!.replace(/^[-*]\s+/, ""));
        i++;
      }
      const task = (item: string) => {
        const m = o.gfm ? /^\[([ xX])\]\s+(.*)$/.exec(item) : null;
        return m
          ? `<li class="task-list-item"><input type="checkbox" disabled${m[1] === " " ? "" : " checked"} /> ${inline(m[2]!)}</li>`
          : `<li>${inline(item)}</li>`;
      };
      htmlBlocks.push(`<ul>${items.map(task).join("")}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i]!)) {
        items.push(lines[i]!.replace(/^\d+\.\s+/, ""));
        i++;
      }
      const start = Number(/^(\d+)/.exec(line)![1]);
      htmlBlocks.push(`<ol${start !== 1 ? ` start="${start}"` : ""}>${items.map((item) => `<li>${inline(item)}</li>`).join("")}</ol>`);
      continue;
    }

    const paraLines: string[] = [];
    while (i < lines.length && lines[i]!.trim().length > 0 && !isBlockStart(lines[i]!)) {
      paraLines.push(lines[i]!);
      i++;
    }
    htmlBlocks.push(
      `<p>${o.hardBreaks ? paraLines.map((l) => inline(l.trim())).join("<br />\n") : inline(paraLines.join(" "))}</p>`,
    );
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

const UNSAFE_URL = /^\s*(javascript|vbscript|data(?!:image\/(png|gif|jpe?g|webp|avif);))\s*:/i;

function inlineToHtml(text: string, o: MarkdownHtmlOptions): string {
  // Code spans are stashed first so ** or _ inside them stay literal.
  const stash: string[] = [];
  const keep = (html: string) => `\u0000${stash.push(html) - 1}\u0000`;
  let html = escapeHtml(text).replace(/`([^`]+)`/g, (_m, code: string) => keep(`<code>${code}</code>`));

  const url = (u: string) => {
    const decoded = u.replace(/&amp;/g, "&");
    return o.safeUrls && UNSAFE_URL.test(decoded.replace(/[\u0000-\u001f]/g, "")) ? "#" : u;
  };
  const linkAttrs = o.externalLinks ? ' target="_blank" rel="noopener noreferrer"' : "";

  const titled = (t?: string) => (t ? ` title="${t}"` : "");
  html = html.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;(.*?)&quot;)?\)/g, (_m, alt: string, u: string, t?: string) =>
    keep(`<img src="${url(u)}" alt="${alt}"${titled(t)} />`),
  );
  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;(.*?)&quot;)?\)/g, (_m, label: string, u: string, t?: string) =>
    keep(`<a href="${url(u)}"${titled(t)}${linkAttrs}>`) + label + "</a>",
  );

  if (o.gfm) {
    // Bare URLs not already inside an href or link text.
    html = html.replace(/(^|[\s(])(https?:\/\/[^\s<]+[^\s<.,:;"')\]])/g, (_m, pre: string, u: string) => `${pre}${keep(`<a href="${u}"${linkAttrs}>${u}</a>`)}`);
    html = html.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  }

  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/(?<![A-Za-z0-9])_([^_]+)_(?![A-Za-z0-9])/g, "<em>$1</em>");

  return html.replace(/\u0000(\d+)\u0000/g, (_m, k: string) => stash[Number(k)]!);
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

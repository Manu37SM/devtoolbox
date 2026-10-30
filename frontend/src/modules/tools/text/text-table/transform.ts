import type { TextTableOptions } from "./schema";

export interface TextTableResult {
  output: string;
  error: { message: string } | null;
}

function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"' && cell.length === 0) {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(cell);
      cell = "";
    } else if (char === "\r") {

    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

const MARKDOWN_SEPARATOR_RE = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

function parseMarkdown(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const rows: string[][] = [];

  for (const line of lines) {
    if (MARKDOWN_SEPARATOR_RE.test(line)) continue;

    let trimmed = line.trim();
    if (trimmed.startsWith("|")) trimmed = trimmed.slice(1);
    if (trimmed.endsWith("|")) trimmed = trimmed.slice(0, -1);

    const cells = trimmed.split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, "|"));
    rows.push(cells);
  }

  return rows;
}

function parseTable(text: string, from: TextTableOptions["from"]): string[][] {
  switch (from) {
    case "csv":
      return parseDelimited(text, ",");
    case "tsv":
      return parseDelimited(text, "\t");
    case "markdown":
      return parseMarkdown(text);
  }
}

function escapeDelimitedCell(cell: string, delimiter: string): string {
  if (cell.includes(delimiter) || cell.includes('"') || cell.includes("\n") || cell.includes("\r")) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}

function renderDelimited(rows: string[][], delimiter: string): string {
  return rows.map((row) => row.map((cell) => escapeDelimitedCell(cell, delimiter)).join(delimiter)).join("\n");
}

type Align = "none" | "left" | "center" | "right";

/** Terminal width: East Asian wide/fullwidth characters and most emoji take two cells. */
export function displayWidth(text: string): number {
  let w = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (cp === 0x200d || (cp >= 0x300 && cp <= 0x36f) || (cp >= 0xfe00 && cp <= 0xfe0f)) continue;
    const wide =
      (cp >= 0x1100 && cp <= 0x115f) ||
      (cp >= 0x2e80 && cp <= 0xa4cf) ||
      (cp >= 0xac00 && cp <= 0xd7a3) ||
      (cp >= 0xf900 && cp <= 0xfaff) ||
      (cp >= 0xfe30 && cp <= 0xfe4f) ||
      (cp >= 0xff00 && cp <= 0xff60) ||
      (cp >= 0xffe0 && cp <= 0xffe6) ||
      (cp >= 0x1f300 && cp <= 0x1faff) ||
      (cp >= 0x20000 && cp <= 0x3fffd);
    w += wide ? 2 : 1;
  }
  return w;
}

function pad(text: string, width: number, align: Align): string {
  const gap = Math.max(0, width - displayWidth(text));
  if (align === "right") return " ".repeat(gap) + text;
  if (align === "center") return " ".repeat(Math.floor(gap / 2)) + text + " ".repeat(Math.ceil(gap / 2));
  return text + " ".repeat(gap);
}

const NUMERIC = /^[-+]?(\d{1,3}(,\d{3})+|\d+)?(\.\d+)?%?$/;

function alignments(rows: string[][], o: Required<Omit<TextTableOptions, "from" | "to">>): Align[] {
  const cols = rows.reduce((m, r) => Math.max(m, r.length), 0);
  return Array.from({ length: cols }, (_, c) => {
    if (o.align !== "auto") return o.align;
    const body = rows.slice(o.hasHeader ? 1 : 0).map((r) => (r[c] ?? "").trim()).filter(Boolean);
    return body.length > 0 && body.every((v) => NUMERIC.test(v)) ? "right" : "none";
  });
}

function renderMarkdown(rows: string[][], o: Required<Omit<TextTableOptions, "from" | "to">>): string {
  if (rows.length === 0) return "";
  const columnCount = rows.reduce((m, r) => Math.max(m, r.length), 0);
  const esc = (c: string) => c.replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
  const all = (o.hasHeader ? rows : [Array.from({ length: columnCount }, (_, i) => `Column ${i + 1}`), ...rows]).map((r) =>
    Array.from({ length: columnCount }, (_, i) => esc(r[i] ?? "")),
  );
  const aligns = alignments(o.hasHeader ? rows : [[], ...rows], o);
  const widths = o.padMarkdown ? columnWidths(all).map((w) => Math.max(3, w)) : [];
  const cell = (c: string, i: number) => (o.padMarkdown ? pad(c, widths[i]!, aligns[i] === "none" ? "left" : aligns[i]!) : c);
  const sep = (i: number) => {
    const w = o.padMarkdown ? widths[i]! : 3;
    switch (aligns[i]) {
      case "left":
        return ":" + "-".repeat(w - 1);
      case "right":
        return "-".repeat(w - 1) + ":";
      case "center":
        return ":" + "-".repeat(w - 2) + ":";
      default:
        return "-".repeat(w);
    }
  };
  const line = (r: string[]) => `| ${r.map(cell).join(" | ")} |`;
  const [header, ...body] = all;
  return [line(header!), `| ${header!.map((_, i) => sep(i)).join(" | ")} |`, ...body.map(line)].join("\n");
}

function columnWidths(rows: string[][]): number[] {
  const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const widths: number[] = new Array(columnCount).fill(0);
  for (const row of rows) {
    for (let i = 0; i < columnCount; i++) {
      const len = displayWidth(row[i] ?? "");
      if (len > (widths[i] ?? 0)) widths[i] = len;
    }
  }
  return widths;
}

const BOX: Record<Exclude<TextTableOptions["asciiStyle"], "plain">, { h: string; v: string; c: string[] }> = {
  // corners/joints: top-left, top-mid, top-right, mid-left, cross, mid-right, bottom-left, bottom-mid, bottom-right
  unicode: { h: "─", v: "│", c: ["┌", "┬", "┐", "├", "┼", "┤", "└", "┴", "┘"] },
  rounded: { h: "─", v: "│", c: ["╭", "┬", "╮", "├", "┼", "┤", "╰", "┴", "╯"] },
  double: { h: "═", v: "║", c: ["╔", "╦", "╗", "╠", "╬", "╣", "╚", "╩", "╝"] },
  ascii: { h: "-", v: "|", c: ["+", "+", "+", "+", "+", "+", "+", "+", "+"] },
};

function renderAscii(rows: string[][], o: Required<Omit<TextTableOptions, "from" | "to">>): string {
  if (rows.length === 0) return "";
  const widths = columnWidths(rows);
  const aligns = alignments(rows, o).map((a) => (a === "none" ? "left" : a));
  const cells = (row: string[]) => widths.map((w, i) => pad((row[i] ?? "").replace(/\r?\n/g, " "), w, aligns[i]!));

  if (o.asciiStyle === "plain") {
    // Like `column -t`: two spaces between columns, a dashed rule under the header.
    const line = (row: string[]) => cells(row).join("  ").trimEnd();
    const out = rows.map(line);
    if (o.hasHeader) out.splice(1, 0, widths.map((w) => "-".repeat(w)).join("  "));
    return out.join("\n");
  }
  const b = BOX[o.asciiStyle];
  const border = (l: number) => b.c[l]! + widths.map((w) => b.h.repeat(w + 2)).join(b.c[l + 1]!) + b.c[l + 2]!;
  const renderRow = (row: string[]) => b.v + cells(row).map((c) => ` ${c} `).join(b.v) + b.v;

  const lines: string[] = [border(0)];
  rows.forEach((row, i) => {
    lines.push(renderRow(row));
    if (i === 0 && o.hasHeader && rows.length > 1) lines.push(border(3));
  });
  lines.push(border(6));
  return lines.join("\n");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderHtml(rows: string[][], o: Required<Omit<TextTableOptions, "from" | "to">>): string {
  const aligns = alignments(rows, o);
  const style = (i: number) => (aligns[i] && aligns[i] !== "none" ? ` style="text-align:${aligns[i]}"` : "");
  const tr = (r: string[], tag: string) => `    <tr>${r.map((c, i) => `<${tag}${style(i)}>${escapeHtml(c)}</${tag}>`).join("")}</tr>`;
  const [head, ...body] = rows;
  const parts = ["<table>"];
  if (o.hasHeader) parts.push("  <thead>", tr(head!, "th"), "  </thead>");
  parts.push("  <tbody>", ...(o.hasHeader ? body : rows).map((r) => tr(r, "td")), "  </tbody>", "</table>");
  return parts.join("\n");
}

function renderJson(rows: string[][], o: Required<Omit<TextTableOptions, "from" | "to">>): string {
  if (!o.hasHeader) return JSON.stringify(rows, null, 2);
  const [head, ...body] = rows;
  const keys = head!.map((k, i) => k || `column${i + 1}`);
  return JSON.stringify(
    body.map((r) => Object.fromEntries(keys.map((k, i) => [k, r[i] ?? ""]))),
    null,
    2,
  );
}

function renderJira(rows: string[][], o: Required<Omit<TextTableOptions, "from" | "to">>): string {
  const esc = (c: string) => (c === "" ? " " : c.replace(/\|/g, "\\|").replace(/\r?\n/g, " \\\\ "));
  return rows
    .map((r, i) => (i === 0 && o.hasHeader ? `|| ${r.map(esc).join(" || ")} ||` : `| ${r.map(esc).join(" | ")} |`))
    .join("\n");
}

function renderTable(rows: string[][], options: TextTableInputOptions): string {
  const o = {
    align: options.align ?? "none",
    padMarkdown: options.padMarkdown ?? false,
    asciiStyle: options.asciiStyle ?? "unicode",
    hasHeader: options.hasHeader ?? true,
    transpose: options.transpose ?? false,
  };
  switch (options.to) {
    case "csv":
      return renderDelimited(rows, ",");
    case "tsv":
      return renderDelimited(rows, "\t");
    case "markdown":
      return renderMarkdown(rows, o);
    case "ascii":
      return renderAscii(rows, o);
    case "html":
      return renderHtml(rows, o);
    case "json":
      return renderJson(rows, o);
    case "jira":
      return renderJira(rows, o);
  }
}

function transpose(rows: string[][]): string[][] {
  const cols = rows.reduce((m, r) => Math.max(m, r.length), 0);
  return Array.from({ length: cols }, (_, c) => rows.map((r) => r[c] ?? ""));
}

export type TextTableInputOptions = Partial<TextTableOptions> & Pick<TextTableOptions, "from" | "to">;

export function convertTable(input: string, options: TextTableInputOptions): TextTableResult {
  if (input.trim().length === 0) return { output: "", error: null };

  try {
    let rows = parseTable(input, options.from);
    if (rows.length === 0) return { output: "", error: null };
    if (options.transpose) rows = transpose(rows);
    const output = renderTable(rows, options);
    return { output, error: null };
  } catch (err) {
    return { output: "", error: { message: err instanceof Error ? err.message : "Table conversion failed" } };
  }
}

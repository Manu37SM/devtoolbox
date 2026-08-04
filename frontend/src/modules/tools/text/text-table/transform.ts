import type { TextTableOptions } from "./schema";

export interface TextTableResult {
  output: string;
  error: { message: string } | null;
}

// ── Parsing ────────────────────────────────────────────────────────────

/** RFC4180-ish delimited parser (handles quoted cells, escaped quotes `""`,
 * and delimiters/newlines inside quotes). Used for both CSV (`,`) and
 * TSV (`\t`). */
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
      // skip, handled with \n
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  // Flush trailing cell/row if the input didn't end with a newline.
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

    const cells = trimmed.split("|").map((cell) => cell.trim());
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

// ── Rendering ──────────────────────────────────────────────────────────

function escapeDelimitedCell(cell: string, delimiter: string): string {
  if (cell.includes(delimiter) || cell.includes('"') || cell.includes("\n") || cell.includes("\r")) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}

function renderDelimited(rows: string[][], delimiter: string): string {
  return rows.map((row) => row.map((cell) => escapeDelimitedCell(cell, delimiter)).join(delimiter)).join("\n");
}

function renderMarkdown(rows: string[][]): string {
  if (rows.length === 0) return "";
  const [header, ...body] = rows;
  const columnCount = header!.length;

  const headerLine = `| ${header!.join(" | ")} |`;
  const separatorLine = `| ${Array.from({ length: columnCount }, () => "---").join(" | ")} |`;
  const bodyLines = body.map((row) => `| ${row.join(" | ")} |`);

  return [headerLine, separatorLine, ...bodyLines].join("\n");
}

function columnWidths(rows: string[][]): number[] {
  const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const widths: number[] = new Array(columnCount).fill(0);
  for (const row of rows) {
    for (let i = 0; i < columnCount; i++) {
      const len = (row[i] ?? "").length;
      if (len > (widths[i] ?? 0)) widths[i] = len;
    }
  }
  return widths;
}

function renderAscii(rows: string[][]): string {
  if (rows.length === 0) return "";
  const widths = columnWidths(rows);

  const border = (left: string, mid: string, right: string, fill: string) =>
    left + widths.map((w) => fill.repeat(w + 2)).join(mid) + right;

  const renderRow = (row: string[]) =>
    "│" + widths.map((w, i) => ` ${(row[i] ?? "").padEnd(w)} `).join("│") + "│";

  const [header, ...body] = rows;
  const lines: string[] = [];
  lines.push(border("┌", "┬", "┐", "─"));
  lines.push(renderRow(header!));
  lines.push(border("├", "┼", "┤", "─"));
  for (const row of body) lines.push(renderRow(row));
  lines.push(border("└", "┴", "┘", "─"));

  return lines.join("\n");
}

function renderTable(rows: string[][], to: TextTableOptions["to"]): string {
  switch (to) {
    case "csv":
      return renderDelimited(rows, ",");
    case "tsv":
      return renderDelimited(rows, "\t");
    case "markdown":
      return renderMarkdown(rows);
    case "ascii":
      return renderAscii(rows);
  }
}

export function convertTable(input: string, options: TextTableOptions): TextTableResult {
  if (input.trim().length === 0) return { output: "", error: null };

  try {
    const rows = parseTable(input, options.from);
    if (rows.length === 0) return { output: "", error: null };
    const output = renderTable(rows, options.to);
    return { output, error: null };
  } catch (err) {
    return { output: "", error: { message: err instanceof Error ? err.message : "Table conversion failed" } };
  }
}

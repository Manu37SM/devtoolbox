import type { CsvTsvOptions } from "./schema";
import type { TransformResult } from "@/lib/tool-transform";

export function convertCsvTsv(input: string, options: CsvTsvOptions): TransformResult {
  if (input.trim().length === 0) return { output: "", error: null };

  try {
    const csv = options.csvDelimiter ?? ",";
    const out = (rows: string[][], delimiter: string) =>
      stringifyDelimited(options.trimFields ? rows.map((r) => r.map((c) => c.trim())) : rows, delimiter, options);

    if (options.mode === "csv-to-tsv") {
      return { output: out(parseDelimited(input, csv), "\t"), error: null };
    }

    if (options.mode === "tsv-to-csv") {
      return { output: out(parseDelimited(input, "\t"), csv), error: null };
    }

    const delimiter = detectDelimiter(input);
    const cleaned = cleanRows(parseDelimited(input, delimiter));
    return { output: out(cleaned, delimiter), error: null };
  } catch (err) {
    return {
      output: "",
      error: { message: err instanceof Error ? err.message : "Conversion failed" },
    };
  }
}

function detectDelimiter(input: string): string {
  const firstLine = input.split(/\r\n|\r|\n/, 1)[0] ?? "";
  let best = ",";
  let bestCount = 0;
  for (const d of [",", "\t", ";", "|"]) {
    const count = firstLine.split(d).length - 1;
    if (count > bestCount) {
      best = d;
      bestCount = count;
    }
  }
  return best;
}

function cleanRows(rows: string[][]): string[][] {
  const trimmed = rows
    .map((row) => row.map((cell) => cell.trim()))
    .filter((row) => !row.every((cell) => cell.length === 0));

  if (trimmed.length === 0) return trimmed;

  const header = trimmed[0]!;
  const result: string[][] = [header];
  for (let i = 1; i < trimmed.length; i++) {
    const row = trimmed[i]!;
    const isDuplicateHeader = row.length === header.length && row.every((cell, idx) => cell === header[idx]);
    if (isDuplicateHeader) continue;
    result.push(row);
  }
  return result;
}

function parseDelimited(input: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i]!;
    const next = input[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"' && field.length === 0) {
      // Quotes only open a quoted field at its start; a quote mid-field is literal text.
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && next === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

function stringifyDelimited(rows: string[][], delimiter: string, options: CsvTsvOptions): string {
  const eol = options.lineEnding === "crlf" ? "\r\n" : "\n";
  return rows.map((row) => row.map((cell) => escapeCell(cell, delimiter, options.quoteAll ?? false)).join(delimiter)).join(eol);
}

/**
 * CSV (RFC 4180): quote fields containing the delimiter, a quote or a line break.
 * TSV has no quoting convention for quotes, so only tabs and line breaks force quoting there.
 */
function escapeCell(value: string, delimiter: string, quoteAll: boolean): string {
  const needs = delimiter === "\t" ? /[\t\r\n]/.test(value) : value.includes(delimiter) || /["\r\n]/.test(value);
  if (quoteAll || needs) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

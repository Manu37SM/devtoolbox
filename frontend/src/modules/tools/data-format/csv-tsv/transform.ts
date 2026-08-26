import type { CsvTsvOptions } from "./schema";
import type { TransformResult } from "@/lib/tool-transform";

export function convertCsvTsv(input: string, options: CsvTsvOptions): TransformResult {
  if (input.trim().length === 0) return { output: "", error: null };

  try {
    if (options.mode === "csv-to-tsv") {
      const rows = parseDelimited(input, ",");
      return { output: stringifyDelimited(rows, "\t"), error: null };
    }

    if (options.mode === "tsv-to-csv") {
      const rows = parseDelimited(input, "\t");
      return { output: stringifyDelimited(rows, ","), error: null };
    }

    const delimiter = detectDelimiter(input);
    const rows = parseDelimited(input, delimiter);
    const cleaned = cleanRows(rows);
    return { output: stringifyDelimited(cleaned, delimiter), error: null };
  } catch (err) {
    return {
      output: "",
      error: { message: err instanceof Error ? err.message : "Conversion failed" },
    };
  }
}

function detectDelimiter(input: string): string {
  const firstLine = input.split(/\r\n|\r|\n/, 1)[0] ?? "";
  const tabCount = (firstLine.match(/\t/g) ?? []).length;
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  return tabCount > commaCount ? "\t" : ",";
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

    if (char === '"') {
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

function stringifyDelimited(rows: string[][], delimiter: string): string {
  return rows.map((row) => row.map((cell) => escapeCell(cell, delimiter)).join(delimiter)).join("\n");
}

function escapeCell(value: string, delimiter: string): string {

  if (value.includes(delimiter)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

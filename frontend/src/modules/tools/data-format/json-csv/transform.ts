import type { JsonCsvOptions } from "./schema";
import type { TransformResult } from "@/lib/tool-transform";

/** Converts a JSON array of flat/nested objects to CSV and back. Hand-rolled
 * (no external CSV library) — RFC 4180 quoting rules for output, and a
 * small state-machine parser for input that handles quoted fields,
 * embedded delimiters/newlines, and escaped quotes ("" inside a field). */
export function convertJsonCsv(input: string, options: JsonCsvOptions): TransformResult {
  if (input.trim().length === 0) return { output: "", error: null };

  try {
    if (options.mode === "json-to-csv") {
      const parsed: unknown = JSON.parse(input);
      if (!Array.isArray(parsed)) {
        return { output: "", error: { message: "Input must be a JSON array of objects." } };
      }
      return { output: jsonToCsv(parsed, options), error: null };
    }

    const rows = parseCsv(input, options.delimiter);
    return { output: csvRowsToJson(rows), error: null };
  } catch (err) {
    return { output: "", error: { message: err instanceof Error ? err.message : "Conversion failed" } };
  }
}

function jsonToCsv(records: unknown[], options: JsonCsvOptions): string {
  const flatRecords = records.map((r) =>
    options.flattenNested && typeof r === "object" && r !== null ? flatten(r as Record<string, unknown>) : (r as Record<string, unknown>),
  );

  const headers = Array.from(new Set(flatRecords.flatMap((r) => Object.keys(r ?? {}))));
  const lines = [headers.map((h) => csvEscape(h, options.delimiter)).join(options.delimiter)];

  for (const record of flatRecords) {
    lines.push(
      headers
        .map((h) => csvEscape(stringifyValue((record as Record<string, unknown>)[h]), options.delimiter))
        .join(options.delimiter),
    );
  }

  return lines.join("\n");
}

function flatten(obj: Record<string, unknown>, prefix = ""): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(result, flatten(value as Record<string, unknown>, path));
    } else {
      result[path] = value;
    }
  }
  return result;
}

function stringifyValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function csvEscape(value: string, delimiter: string): string {
  if (value.includes(delimiter) || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function parseCsv(input: string, delimiter: string): string[][] {
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

function csvRowsToJson(rows: string[][]): string {
  if (rows.length === 0) return "[]";
  const [header, ...dataRows] = rows;
  const records = dataRows.map((row) => {
    const record: Record<string, string> = {};
    header!.forEach((key, i) => {
      record[key] = row[i] ?? "";
    });
    return record;
  });
  return JSON.stringify(records, null, 2);
}

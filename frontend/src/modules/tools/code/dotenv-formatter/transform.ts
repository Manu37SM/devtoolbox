import type { DotenvFormatterOptions } from "./schema";

export interface DotenvEntryLine {
  type: "entry";
  key: string;
  value: string;
  quote: '"' | "'" | null;
  exportPrefix: boolean;
}
export interface DotenvCommentLine {
  type: "comment";
  raw: string;
}
export interface DotenvBlankLine {
  type: "blank";
}
export type DotenvLine = DotenvEntryLine | DotenvCommentLine | DotenvBlankLine;

export interface DotenvParseResult {
  lines: DotenvLine[];
  warnings: string[];
}

const KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

function parseLine(raw: string, lineNumber: number, warnings: string[]): DotenvLine | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { type: "blank" };
  if (trimmed.startsWith("#")) return { type: "comment", raw: trimmed };

  let content = trimmed;
  let exportPrefix = false;
  const exportMatch = /^export\s+/.exec(content);
  if (exportMatch) {
    content = content.slice(exportMatch[0].length);
    exportPrefix = true;
  }

  const eqIdx = content.indexOf("=");
  if (eqIdx === -1) {
    warnings.push(`Line ${lineNumber}: missing "=" — skipped ("${trimmed}")`);
    return null;
  }

  const key = content.slice(0, eqIdx).trim();
  const rawValue = content.slice(eqIdx + 1).trim();

  if (!KEY_RE.test(key)) {
    warnings.push(`Line ${lineNumber}: invalid key name "${key}" — skipped`);
    return null;
  }

  let quote: '"' | "'" | null = null;
  let value = rawValue;
  if (
    rawValue.length >= 2 &&
    ((rawValue.startsWith('"') && rawValue.endsWith('"')) || (rawValue.startsWith("'") && rawValue.endsWith("'")))
  ) {
    quote = rawValue[0] as '"' | "'";
    value = rawValue.slice(1, -1);
  } else {

    const hashIdx = rawValue.indexOf(" #");
    if (hashIdx !== -1) value = rawValue.slice(0, hashIdx).trim();
  }

  return { type: "entry", key, value, quote, exportPrefix };
}

export function parseDotenv(input: string): DotenvParseResult {
  const rawLines = input.replace(/\r\n/g, "\n").split("\n");
  const warnings: string[] = [];
  const seenAt = new Map<string, number>();
  const lines: DotenvLine[] = [];

  rawLines.forEach((raw, idx) => {
    const lineNumber = idx + 1;
    const parsed = parseLine(raw, lineNumber, warnings);
    if (parsed === null) return;
    if (parsed.type === "entry") {
      const firstLine = seenAt.get(parsed.key);
      if (firstLine !== undefined) {
        warnings.push(`Line ${lineNumber}: duplicate key "${parsed.key}" (first defined at line ${firstLine})`);
      } else {
        seenAt.set(parsed.key, lineNumber);
      }
    }
    lines.push(parsed);
  });

  return { lines, warnings };
}

function needsQuotingForSafety(value: string): boolean {
  return /[\s#"']/.test(value);
}

function formatEntry(entry: DotenvEntryLine, quoteMode: DotenvFormatterOptions["quoteValues"]): string {
  const prefix = entry.exportPrefix ? "export " : "";
  let valueOut: string;

  if (quoteMode === "always") {
    valueOut = `"${entry.value.replace(/"/g, '\\"')}"`;
  } else if (quoteMode === "never") {
    valueOut = entry.value;
  } else if (entry.quote) {
    valueOut = `${entry.quote}${entry.value}${entry.quote}`;
  } else if (needsQuotingForSafety(entry.value)) {
    valueOut = `"${entry.value.replace(/"/g, '\\"')}"`;
  } else {
    valueOut = entry.value;
  }

  return `${prefix}${entry.key}=${valueOut}`;
}

export interface DotenvFormatResult {
  output: string;
  warnings: string[];
  error: { message: string } | null;
}

export function formatDotenv(input: string, options: DotenvFormatterOptions): DotenvFormatResult {
  const { lines, warnings } = parseDotenv(input);

  let filtered = lines.filter((l) => {
    if (l.type === "comment" && options.removeComments) return false;
    if (l.type === "blank" && options.removeEmptyLines) return false;
    return true;
  });

  if (options.sortKeys) {
    const nonEntries = filtered.filter((l) => l.type !== "entry");
    const entries = filtered
      .filter((l): l is DotenvEntryLine => l.type === "entry")
      .slice()
      .sort((a, b) => a.key.localeCompare(b.key));
    filtered = [...nonEntries, ...entries];
  }

  const outputLines = filtered.map((l) => {
    if (l.type === "blank") return "";
    if (l.type === "comment") return l.raw;
    return formatEntry(l, options.quoteValues);
  });

  return { output: outputLines.join("\n"), warnings, error: null };
}

import type { LineSortDedupeOptions } from "./schema";

export interface LineSortDedupeResult {
  output: string;
  /** Lines in and out, for the "removed N lines" summary. */
  stats?: { input: number; output: number };
  error: { message: string } | null;
}

type Opts = Partial<LineSortDedupeOptions> & Pick<LineSortDedupeOptions, "sort" | "dedupe">;

function keyOf(line: string, o: Opts): string {
  const col = o.column ?? 0;
  if (col === 0) return line;
  const d = o.columnDelimiter ?? "whitespace";
  const fields = d === "whitespace" ? line.trim().split(/\s+/) : line.split(d);
  return fields[col - 1] ?? "";
}

function sortLines(lines: string[], o: Opts): string[] {
  const textCmp = (o.caseSensitive ?? false)
    ? (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)
    : (a: string, b: string) => a.localeCompare(b);
  const natural = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: o.caseSensitive ? "variant" : "base",
    caseFirst: o.caseSensitive ? "upper" : "false",
  });
  const numCmp = (a: string, b: string) => {
    const numA = parseFloat(a.replace(/,/g, ""));
    const numB = parseFloat(b.replace(/,/g, ""));
    const aIsNum = !Number.isNaN(numA);
    const bIsNum = !Number.isNaN(numB);
    if (aIsNum && bIsNum) return numA - numB;
    if (aIsNum) return -1;
    if (bIsNum) return 1;
    return textCmp(a, b);
  };
  const by = (cmp: (a: string, b: string) => number, desc = false) =>
    // Array.prototype.sort is stable, so equal keys keep their input order.
    [...lines].sort((a, b) => (desc ? -1 : 1) * cmp(keyOf(a, o), keyOf(b, o)));

  switch (o.sort) {
    case "none":
      return lines;
    case "alpha":
      return by(textCmp);
    case "alpha-desc":
      return by(textCmp, true);
    case "natural":
      return by(natural.compare);
    case "natural-desc":
      return by(natural.compare, true);
    case "numeric":
      return by(numCmp);
    case "numeric-desc":
      return by(numCmp, true);
    case "length":
      return by((a, b) => a.length - b.length);
    case "length-desc":
      return by((a, b) => b.length - a.length);
    case "reverse":
      return [...lines].reverse();
    case "shuffle": {
      const result = [...lines];
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j]!, result[i]!];
      }
      return result;
    }
    default:
      return lines;
  }
}

function dedupeLines(lines: string[], o: Opts): { lines: string[]; counts: Map<string, number> } {
  const ci = o.dedupe === "case-insensitive";
  const k = (line: string) => (ci ? line.toLowerCase() : line);
  const counts = new Map<string, number>();
  for (const line of lines) counts.set(k(line), (counts.get(k(line)) ?? 0) + 1);
  if (o.dedupe === "none") return { lines, counts };
  const seen = new Set<string>();
  const result: string[] = [];
  for (const line of lines) {
    const key = k(line);
    const n = counts.get(key)!;
    if (o.dedupe === "unique" && n > 1) continue;
    if (o.dedupe === "duplicates" && n < 2) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(line);
  }
  return { lines: result, counts };
}

export function sortDedupeLines(input: string, options: Opts): LineSortDedupeResult {
  if (input.length === 0) return { output: "", error: null };

  try {
    // Keep Windows line endings intact instead of leaving \r inside each line.
    const eol = /\r\n/.test(input) ? "\r\n" : "\n";
    let lines = input.split(/\r?\n/);
    const before = lines.length;

    if (options.trimWhitespace) {
      lines = lines.map((line) => line.trim());
    }
    if (options.trimEmptyLines) {
      lines = lines.filter((line) => line.trim().length > 0);
    }

    const deduped = dedupeLines(lines, options);
    lines = sortLines(deduped.lines, options);
    if (options.countOccurrences) {
      const k = (l: string) => (options.dedupe === "case-insensitive" ? l.toLowerCase() : l);
      const width = String(Math.max(0, ...deduped.counts.values())).length;
      lines = lines.map((l) => `${String(deduped.counts.get(k(l)) ?? 1).padStart(width)} ${l}`);
    }

    return { output: lines.join(eol), stats: { input: before, output: lines.length }, error: null };
  } catch (err) {
    return { output: "", error: { message: err instanceof Error ? err.message : "Transform failed" } };
  }
}

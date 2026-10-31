import type { TransformResult } from "@/lib/tool-transform";
import type { ColumnExtractorOptions } from "./schema";

type Range = { from: number; to: number | null; fromEnd: boolean; toEnd: boolean; toOpen: boolean };

/** Parses "1,3-5,-2,4-,~1,~3-~1" into ranges. Throws on bad syntax. */
export function parseColumnSpec(spec: string): Range[] {
  const out: Range[] = [];
  const num = /^(~?)(\d+)$/;
  for (const raw of spec.split(",")) {
    const part = raw.trim();
    if (!part) continue;
    const bits = /^(~?\d+)?-(~?\d+)?$/.exec(part);
    if (bits && (bits[1] || bits[2])) {
      const a = bits[1] ? num.exec(bits[1])! : null;
      const b = bits[2] ? num.exec(bits[2])! : null;
      out.push({
        from: a ? Number(a[2]) : 1,
        fromEnd: a ? a[1] === "~" : false,
        to: b ? Number(b[2]) : null,
        toEnd: b ? b[1] === "~" : false,
        toOpen: !b,
      });
      continue;
    }
    const one = num.exec(part);
    if (!one) throw new Error(`"${part}" is not a column. Use numbers like 1, 3-5, 4-, -2 or ~1 (last column).`);
    out.push({ from: Number(one[2]), fromEnd: one[1] === "~", to: Number(one[2]), toEnd: one[1] === "~", toOpen: false });
  }
  if (!out.length) throw new Error("Enter at least one column, for example 1,3-5.");
  for (const r of out) if (r.from === 0 || r.to === 0) throw new Error("Columns start at 1 (use ~1 for the last one).");
  return out;
}

/** 0-based indexes selected for a line with `n` columns, in the order written (-1 = missing). */
function resolve(ranges: Range[], n: number): number[] {
  const idx: number[] = [];
  for (const r of ranges) {
    const a = r.fromEnd ? n - r.from + 1 : r.from;
    const b = r.toOpen ? n : r.toEnd ? n - (r.to ?? 1) + 1 : (r.to ?? a);
    if (a <= b) for (let i = a; i <= b; i++) idx.push(i >= 1 && i <= n ? i - 1 : -1);
    else for (let i = a; i >= b; i--) idx.push(i >= 1 && i <= n ? i - 1 : -1); // reversed range like 5-2 or ~1-~3
  }
  return idx;
}

function splitQuoted(line: string, d: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (line.startsWith(d, i)) { out.push(cur); cur = ""; i += d.length - 1; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

const SEPS: Record<string, string> = { space: " ", tab: "\t", comma: ",", semicolon: ";", pipe: "|", colon: ":" };

export function columnExtractor(input: string, options: Partial<ColumnExtractorOptions>): TransformResult {
  const o: ColumnExtractorOptions = {
    split: options.split ?? "whitespace",
    delimiterText: options.delimiterText ?? "",
    columns: options.columns ?? "1",
    mode: options.mode ?? "keep",
    outputSeparator: options.outputSeparator ?? "same",
    outputCustom: options.outputCustom ?? "",
    respectQuotes: options.respectQuotes ?? false,
    trim: options.trim ?? true,
    skipEmptyLines: options.skipEmptyLines ?? true,
    skipLines: options.skipLines ?? 0,
    missing: options.missing ?? "empty",
    deduplicate: options.deduplicate ?? false,
  };
  if (!input) return { output: "", error: null };
  let ranges: Range[];
  let regex: RegExp | null = null;
  try {
    ranges = parseColumnSpec(o.columns);
    if (o.split === "regex") {
      if (!o.delimiterText) throw new Error("Enter a regular expression to split on.");
      regex = new RegExp(o.delimiterText);
    }
    if (o.split === "custom" && !o.delimiterText) throw new Error("Enter the text that separates the columns.");
  } catch (e) {
    return { output: "", error: { message: (e as Error).message } };
  }

  const delim = o.split === "custom" ? o.delimiterText : SEPS[o.split];
  const outSep =
    o.outputSeparator === "same"
      ? o.split === "whitespace" || o.split === "regex" || o.split === "chars"
        ? o.split === "whitespace" ? " " : o.split === "chars" ? "" : "\t"
        : (delim ?? " ")
      : o.outputSeparator === "custom" ? o.outputCustom : SEPS[o.outputSeparator]!;

  const lines = input.split(/\r?\n/).slice(o.skipLines);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    if (!line.trim() && o.skipEmptyLines) continue;
    let cols: string[];
    if (o.split === "chars") cols = [...line];
    else if (o.split === "whitespace") cols = line.trim().split(/\s+/).filter((c) => c !== "");
    else if (regex) cols = line.split(regex);
    else if (o.respectQuotes && delim) cols = splitQuoted(line, delim);
    else cols = line.split(delim ?? ",");
    if (o.trim && o.split !== "chars") cols = cols.map((c) => c.trim());

    const picks = resolve(ranges, cols.length);
    if (o.missing === "skip-line" && picks.includes(-1) && o.mode === "keep") continue;
    let result: string[];
    if (o.mode === "keep") result = (o.missing === "omit" ? picks.filter((i) => i >= 0) : picks).map((i) => (i < 0 ? "" : cols[i]!));
    else {
      const drop = new Set(picks.filter((i) => i >= 0));
      result = cols.filter((_c, i) => !drop.has(i));
    }
    const text = result.join(outSep);
    if (o.deduplicate) {
      if (seen.has(text)) continue;
      seen.add(text);
    }
    out.push(text);
  }
  return { output: out.join("\n"), error: null };
}

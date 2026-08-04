import type { CodeDiffOptions } from "./schema";

export type DiffOpType = "equal" | "add" | "remove";
export interface DiffOp {
  type: DiffOpType;
  value: string;
}

export interface DiffStats {
  additions: number;
  removals: number;
  unchanged: number;
}

export interface CodeDiffResult {
  output: string;
  ops: DiffOp[];
  stats: DiffStats;
  error: { message: string } | null;
}

// An empty string tokenizes to zero lines (not one empty-string line) so
// that "no before text" diffs as pure additions rather than a spurious
// "remove one blank line" op.
function tokenize(text: string): string[] {
  return text.length === 0 ? [] : text.split("\n");
}

function normalizeLine(line: string, options: CodeDiffOptions): string {
  let t = line;
  if (options.ignoreWhitespace) t = t.trim();
  if (options.ignoreCase) t = t.toLowerCase();
  return t;
}

/** Same classic LCS (longest common subsequence) dynamic-programming
 * algorithm used by text-diff/transform.ts's `lcsDiff`, adapted here to
 * operate line-by-line only (source code is naturally line-oriented) and
 * to leave each op as a single line rather than merging consecutive
 * same-type ops, since unified-diff-style output wants one +/-/  marker
 * per line. */
function lcsDiff(a: string[], b: string[], na: string[], nb: string[]): DiffOp[] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));

  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i]![j] = na[i] === nb[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }

  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (na[i] === nb[j]) {
      ops.push({ type: "equal", value: a[i]! });
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      ops.push({ type: "remove", value: a[i]! });
      i++;
    } else {
      ops.push({ type: "add", value: b[j]! });
      j++;
    }
  }
  while (i < m) ops.push({ type: "remove", value: a[i++]! });
  while (j < n) ops.push({ type: "add", value: b[j++]! });

  return ops;
}

export function diffCode(before: string, after: string, options: CodeDiffOptions): DiffOp[] {
  const a = tokenize(before);
  const b = tokenize(after);
  const na = a.map((t) => normalizeLine(t, options));
  const nb = b.map((t) => normalizeLine(t, options));
  return lcsDiff(a, b, na, nb);
}

export function diffStats(ops: DiffOp[]): DiffStats {
  return ops.reduce<DiffStats>(
    (acc, op) => {
      if (op.type === "add") acc.additions++;
      else if (op.type === "remove") acc.removals++;
      else acc.unchanged++;
      return acc;
    },
    { additions: 0, removals: 0, unchanged: 0 },
  );
}

/** Renders line-diff ops as unified-diff-style text: `+ line`, `- line`,
 * and `  line` (two spaces) for unchanged context lines. */
export function formatUnifiedDiff(ops: DiffOp[]): string {
  return ops
    .map((op) => {
      const prefix = op.type === "add" ? "+ " : op.type === "remove" ? "- " : "  ";
      return prefix + op.value;
    })
    .join("\n");
}

export function generateCodeDiff(before: string, after: string, options: CodeDiffOptions): CodeDiffResult {
  if (before.length === 0 && after.length === 0) {
    return { output: "", ops: [], stats: { additions: 0, removals: 0, unchanged: 0 }, error: null };
  }
  const ops = diffCode(before, after, options);
  return { output: formatUnifiedDiff(ops), ops, stats: diffStats(ops), error: null };
}

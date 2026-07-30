import type { TextDiffOptions } from "./schema";

export type DiffOpType = "equal" | "add" | "remove";
export interface DiffOp {
  type: DiffOpType;
  value: string;
}

// Line tokens are plain line content with no embedded newline — this
// means a line's identity for diffing purposes doesn't depend on whether
// it happens to be the last line in the document (avoids the classic bug
// where appending a line makes the *previous* last line look "changed"
// just because it gained a trailing newline). The newline is reintroduced
// by `mergeConsecutive`'s joiner when adjacent same-type lines are
// combined into one display chunk (standard unified-diff style output).
function tokenize(text: string, mode: TextDiffOptions["mode"]): string[] {
  switch (mode) {
    case "line":
      return text.split("\n");
    case "word":
      return text.split(/(\s+)/).filter((t) => t.length > 0);
    case "char":
    default:
      return Array.from(text);
  }
}

function joinerFor(mode: TextDiffOptions["mode"]): string {
  return mode === "line" ? "\n" : "";
}

function normalizeToken(token: string, options: TextDiffOptions): string {
  let t = token;
  if (options.ignoreWhitespace) t = t.trim();
  if (options.ignoreCase) t = t.toLowerCase();
  return t;
}

/** Line/word/char diff via the classic LCS (longest common subsequence)
 * dynamic-programming algorithm over tokens. O(n*m) — fine for the
 * typical "paste two versions of a file" use case; very large inputs
 * (>~2000 tokens per side) should move to a Worker (isWorkerEligible). */
export function diffText(before: string, after: string, options: TextDiffOptions): DiffOp[] {
  const a = tokenize(before, options.mode);
  const b = tokenize(after, options.mode);
  const na = a.map((t) => normalizeToken(t, options));
  const nb = b.map((t) => normalizeToken(t, options));

  const ops = lcsDiff(a, b, na, nb);
  return mergeConsecutive(ops, joinerFor(options.mode));
}

/** Token-level (unmerged) diff stats — one count per token (line/word/char
 * depending on mode), not per merged display chunk. */
export function diffTokenStats(before: string, after: string, options: TextDiffOptions): DiffStats {
  const a = tokenize(before, options.mode);
  const b = tokenize(after, options.mode);
  const ops = lcsDiff(a, b, a.map((t) => normalizeToken(t, options)), b.map((t) => normalizeToken(t, options)));
  return diffStats(ops);
}

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

function mergeConsecutive(ops: DiffOp[], joiner: string): DiffOp[] {
  const merged: DiffOp[] = [];
  for (const op of ops) {
    const last = merged[merged.length - 1];
    if (last && last.type === op.type) {
      last.value += joiner + op.value;
    } else {
      merged.push({ ...op });
    }
  }
  return merged;
}

export interface DiffStats {
  additions: number;
  removals: number;
  unchanged: number;
}

export function diffStats(ops: DiffOp[]): DiffStats {
  return ops.reduce(
    (acc, op) => {
      if (op.type === "add") acc.additions++;
      else if (op.type === "remove") acc.removals++;
      else acc.unchanged++;
      return acc;
    },
    { additions: 0, removals: 0, unchanged: 0 },
  );
}

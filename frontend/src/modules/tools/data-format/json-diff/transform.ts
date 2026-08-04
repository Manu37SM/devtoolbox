import type { JsonDiffOptions } from "./schema";

export interface JsonDiffEntry {
  path: string;
  type: "added" | "removed" | "changed";
  before?: unknown;
  after?: unknown;
}

export interface JsonDiffResult {
  output: string;
  diffs: JsonDiffEntry[];
  error: { message: string; line?: number; column?: number } | null;
}

/** Hand-rolled structural diff between two parsed JSON values. Pure and
 * DOM-free, so it's safe for Workers/SSR/tests. */
export function diffJson(
  beforeInput: string,
  afterInput: string,
  options: JsonDiffOptions,
): JsonDiffResult {
  if (beforeInput.trim().length === 0 && afterInput.trim().length === 0) {
    return { output: "", diffs: [], error: null };
  }

  let before: unknown;
  let after: unknown;
  try {
    before = JSON.parse(beforeInput.trim().length === 0 ? "null" : beforeInput);
  } catch (err) {
    return {
      output: "",
      diffs: [],
      error: { message: `Invalid "Before" JSON: ${err instanceof Error ? err.message : "parse error"}` },
    };
  }
  try {
    after = JSON.parse(afterInput.trim().length === 0 ? "null" : afterInput);
  } catch (err) {
    return {
      output: "",
      diffs: [],
      error: { message: `Invalid "After" JSON: ${err instanceof Error ? err.message : "parse error"}` },
    };
  }

  const diffs: JsonDiffEntry[] = [];
  walk(before, after, "", diffs, options);

  if (diffs.length === 0) {
    return { output: "No differences found.", diffs, error: null };
  }

  const lines = diffs.map((d) => {
    if (d.type === "added") return `+ ${d.path}: ${JSON.stringify(d.after)}`;
    if (d.type === "removed") return `- ${d.path}`;
    return `~ ${d.path}: ${JSON.stringify(d.before)} → ${JSON.stringify(d.after)}`;
  });

  return { output: lines.join("\n"), diffs, error: null };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function walk(
  before: unknown,
  after: unknown,
  path: string,
  diffs: JsonDiffEntry[],
  options: JsonDiffOptions,
): void {
  if (deepEqual(before, after, options)) return;

  if (isPlainObject(before) && isPlainObject(after)) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of Array.from(keys).sort()) {
      const childPath = path ? `${path}.${key}` : key;
      const hasBefore = Object.prototype.hasOwnProperty.call(before, key);
      const hasAfter = Object.prototype.hasOwnProperty.call(after, key);
      if (hasBefore && !hasAfter) {
        diffs.push({ path: childPath, type: "removed", before: before[key] });
      } else if (!hasBefore && hasAfter) {
        diffs.push({ path: childPath, type: "added", after: after[key] });
      } else {
        walk(before[key], after[key], childPath, diffs, options);
      }
    }
    return;
  }

  if (Array.isArray(before) && Array.isArray(after)) {
    if (options.ignoreArrayOrder && allPrimitive(before) && allPrimitive(after)) {
      const beforeSorted = [...before].sort(comparePrimitive);
      const afterSorted = [...after].sort(comparePrimitive);
      if (deepEqual(beforeSorted, afterSorted, options)) return;
    }

    const maxLength = Math.max(before.length, after.length);
    for (let i = 0; i < maxLength; i++) {
      const childPath = `${path}[${i}]`;
      if (i >= before.length) {
        diffs.push({ path: childPath, type: "added", after: after[i] });
      } else if (i >= after.length) {
        diffs.push({ path: childPath, type: "removed", before: before[i] });
      } else {
        walk(before[i], after[i], childPath, diffs, options);
      }
    }
    return;
  }

  diffs.push({ path: path || "(root)", type: "changed", before, after });
}

function allPrimitive(arr: unknown[]): boolean {
  return arr.every((v) => v === null || (typeof v !== "object" && typeof v !== "function"));
}

function comparePrimitive(a: unknown, b: unknown): number {
  return String(a).localeCompare(String(b));
}

function deepEqual(a: unknown, b: unknown, options: JsonDiffOptions): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (options.ignoreArrayOrder && allPrimitive(a) && allPrimitive(b)) {
      const as = [...a].sort(comparePrimitive);
      const bs = [...b].sort(comparePrimitive);
      return as.length === bs.length && as.every((v, i) => deepEqual(v, bs[i], options));
    }
    return a.length === b.length && a.every((v, i) => deepEqual(v, b[i], options));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k], options));
  }
  return false;
}

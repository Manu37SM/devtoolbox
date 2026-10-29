import type { JsonDiffOptions } from "./schema";
import { parseJsonLossless, type JNode } from "@/lib/json-lossless";

/** A number a JS double cannot hold exactly (64-bit IDs, long decimals); compared by its digits. */
class ExactNumber {
  constructor(readonly raw: string) {}
  toJSON(): string {
    return `${EXACT}${this.raw}${EXACT}`;
  }
}
const EXACT = "~exact~";
// JSON.stringify leaves "~" alone, so the marker survives as plain text inside the quotes.
const EXACT_RE = /"~exact~(-?[\d.eE+-]+)~exact~"/g;

function toValue(n: JNode): unknown {
  switch (n.kind) {
    case "object":
      return Object.fromEntries(n.entries.map(([k, v]) => [k, toValue(v)]));
    case "array":
      return n.items.map(toValue);
    case "string":
      return n.value;
    case "number": {
      const num = Number(n.raw);
      return Number.isFinite(num) && sameDigits(String(num), n.raw) ? num : new ExactNumber(n.raw);
    }
    default:
      return n.value;
  }
}

function sameDigits(a: string, b: string): boolean {
  return normaliseNumber(a) === normaliseNumber(b);
}

function normaliseNumber(raw: string): string {
  const m = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(raw);
  if (!m) return raw;
  const digits = (m[2]! + (m[3] ?? "")).replace(/^0+/, "");
  const lead = (m[2]! + (m[3] ?? "")).length - digits.length;
  const trimmed = digits.replace(/0+$/, "");
  if (!trimmed) return "0";
  return `${m[1]}${trimmed}e${Number(m[4] ?? 0) + m[2]!.length - lead}`;
}

/** JSON text for display, writing exact numbers back as bare numbers. */
function show(value: unknown, indent?: number): string {
  return JSON.stringify(value, null, indent).replace(EXACT_RE, "$1");
}

export interface JsonDiffEntry {
  path: string;
  /** JSON Pointer (RFC 6901) of the same location. */
  pointer: string;
  type: "added" | "removed" | "changed";
  before?: unknown;
  after?: unknown;
}

export interface JsonDiffResult {
  output: string;
  diffs: JsonDiffEntry[];
  error: { message: string; line?: number; column?: number } | null;
}

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
    before = toValue(parseJsonLossless(beforeInput.trim().length === 0 ? "null" : beforeInput));
  } catch (err) {
    return {
      output: "",
      diffs: [],
      error: { message: `Invalid "Before" JSON: ${err instanceof Error ? err.message : "parse error"}` },
    };
  }
  try {
    after = toValue(parseJsonLossless(afterInput.trim().length === 0 ? "null" : afterInput));
  } catch (err) {
    return {
      output: "",
      diffs: [],
      error: { message: `Invalid "After" JSON: ${err instanceof Error ? err.message : "parse error"}` },
    };
  }

  const ignore = compileIgnore(options.ignorePaths ?? "");
  if (ignore) {
    before = stripIgnored(before, "", ignore);
    after = stripIgnored(after, "", ignore);
  }

  const diffs: JsonDiffEntry[] = [];
  walk(before, after, "", "", diffs, options);

  if (options.output === "patch") {
    return { output: show(toPatch(diffs), 2), diffs, error: null };
  }

  if (diffs.length === 0) {
    return { output: "No differences found.", diffs, error: null };
  }

  const lines = diffs.map((d) => {
    if (d.type === "added") return `+ ${d.path}: ${show(d.after)}`;
    if (d.type === "removed") return `- ${d.path}`;
    return `~ ${d.path}: ${show(d.before)} → ${show(d.after)}`;
  });

  return { output: lines.join("\n"), diffs, error: null };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof ExactNumber);
}

function walk(
  before: unknown,
  after: unknown,
  path: string,
  ptr: string,
  diffs: JsonDiffEntry[],
  options: JsonDiffOptions,
): void {
  if (deepEqual(before, after, options)) return;

  if (isPlainObject(before) && isPlainObject(after)) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of Array.from(keys).sort()) {
      const childPath = path ? `${path}.${key}` : key;
      const childPtr = `${ptr}/${escapePointer(key)}`;
      const hasBefore = Object.prototype.hasOwnProperty.call(before, key);
      const hasAfter = Object.prototype.hasOwnProperty.call(after, key);
      if (hasBefore && !hasAfter) {
        diffs.push({ path: childPath, pointer: childPtr, type: "removed", before: before[key] });
      } else if (!hasBefore && hasAfter) {
        diffs.push({ path: childPath, pointer: childPtr, type: "added", after: after[key] });
      } else {
        walk(before[key], after[key], childPath, childPtr, diffs, options);
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
      const childPtr = `${ptr}/${i}`;
      if (i >= before.length) {
        diffs.push({ path: childPath, pointer: childPtr, type: "added", after: after[i] });
      } else if (i >= after.length) {
        diffs.push({ path: childPath, pointer: childPtr, type: "removed", before: before[i] });
      } else {
        walk(before[i], after[i], childPath, childPtr, diffs, options);
      }
    }
    return;
  }

  diffs.push({ path: path || "(root)", pointer: ptr, type: "changed", before, after });
}

function allPrimitive(arr: unknown[]): boolean {
  return arr.every((v) => v === null || (typeof v !== "object" && typeof v !== "function"));
}

function comparePrimitive(a: unknown, b: unknown): number {
  return String(a).localeCompare(String(b));
}

function deepEqual(a: unknown, b: unknown, options: JsonDiffOptions): boolean {
  if (a === b) return true;
  if (a instanceof ExactNumber || b instanceof ExactNumber) {
    const ra = a instanceof ExactNumber ? a.raw : typeof a === "number" ? String(a) : null;
    const rb = b instanceof ExactNumber ? b.raw : typeof b === "number" ? String(b) : null;
    return ra !== null && rb !== null && sameDigits(ra, rb);
  }
  if (typeof a === "number" && typeof b === "number" && options.numericTolerance) {
    return Math.abs(a - b) <= options.numericTolerance;
  }
  if (typeof a === "string" && typeof b === "string" && options.ignoreCase) {
    return a.toLowerCase() === b.toLowerCase();
  }
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

function escapePointer(key: string): string {
  return key.replace(/~/g, "~0").replace(/\//g, "~1");
}

/** Matches dotted paths like "a.b[0].c" against the ignore patterns. */
function compileIgnore(spec: string): ((path: string) => boolean) | null {
  const patterns = spec
    .split(/[,\n]/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (patterns.length === 0) return null;
  const res = patterns.map((p) => {
    const bare = !/[.[]/.test(p);
    const body = p
      .split(/(\[\*\]|\[\d+\]|\.)/)
      .map((part) => {
        if (part === "[*]") return "\\[\\d+\\]";
        if (part === ".") return "\\.";
        if (part === "*") return "[^.[\\]]+";
        return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      })
      .join("");
    // A bare key ("updatedAt") matches that key at any depth.
    return new RegExp(bare ? `(^|\\.)${body}$` : `^${body}$`);
  });
  return (path) => res.some((re) => re.test(path));
}

function stripIgnored(value: unknown, path: string, ignored: (path: string) => boolean): unknown {
  if (Array.isArray(value)) return value.map((v, i) => stripIgnored(v, `${path}[${i}]`, ignored));
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const child = path ? `${path}.${k}` : k;
      if (!ignored(child)) out[k] = stripIgnored(v, child, ignored);
    }
    return out;
  }
  return value;
}

type PatchOp = { op: "add" | "remove" | "replace"; path: string; value?: unknown };

/** RFC 6902 operations; array removals run from the highest index down so indexes stay valid. */
function toPatch(diffs: JsonDiffEntry[]): PatchOp[] {
  const ops: PatchOp[] = diffs.map((d) =>
    d.type === "added"
      ? { op: "add", path: d.pointer, value: d.after }
      : d.type === "removed"
        ? { op: "remove", path: d.pointer }
        : { op: "replace", path: d.pointer, value: d.after },
  );
  const arrayRemovals = ops.filter((o) => o.op === "remove" && /\/\d+$/.test(o.path)).reverse();
  return [...ops.filter((o) => !(o.op === "remove" && /\/\d+$/.test(o.path))), ...arrayRemovals];
}


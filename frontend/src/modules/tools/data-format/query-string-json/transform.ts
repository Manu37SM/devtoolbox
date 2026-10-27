import type { TransformResult } from "@/lib/tool-transform";
import type { QueryStringJsonOptions } from "./schema";

// Null-prototype containers: a key like "__proto__" becomes a plain own property
// instead of reaching Object.prototype.
type Node = { [key: string]: unknown };
const newNode = (): Node => Object.create(null) as Node;

const NUMBER_PATTERN = /^-?(0|[1-9]\d{0,14})(\.\d+)?$/;

function coerce(value: string): unknown {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (NUMBER_PATTERN.test(value)) return Number(value);
  return value;
}

/** "a[b][c]" -> ["a","b","c"], "a[]" -> { segments: ["a"], push: true }. Null when the key isn't bracket syntax. */
function parseKeyPath(key: string): { segments: string[]; push: boolean } | null {
  const m = /^([^[\]]+)((?:\[[^[\]]*\])+)$/.exec(key);
  if (!m) return null;
  const segments = [m[1]!];
  for (const part of m[2]!.matchAll(/\[([^[\]]*)\]/g)) segments.push(part[1]!);
  const push = segments[segments.length - 1] === "";
  if (push) segments.pop();
  // An empty segment anywhere but the end ("a[][b]") is not supported; treat as a literal key.
  if (segments.some((s) => s === "")) return null;
  return { segments, push };
}

function addValue(container: Node, key: string, value: unknown, forceArray: boolean) {
  const existing = container[key];
  if (existing === undefined) container[key] = forceArray ? [value] : value;
  else if (Array.isArray(existing)) existing.push(value);
  else container[key] = [existing, value];
}

function insert(root: Node, rawKey: string, value: unknown, nested: boolean) {
  const path = nested ? parseKeyPath(rawKey) : null;
  if (!path) {
    addValue(root, rawKey, value, false);
    return;
  }
  let cursor = root;
  const parents = path.segments.slice(0, -1);
  const leaf = path.segments[path.segments.length - 1]!;
  for (const seg of parents) {
    const next = cursor[seg];
    if (next === undefined) {
      const created = newNode();
      cursor[seg] = created;
      cursor = created;
    } else if (typeof next === "object" && next !== null && !Array.isArray(next)) {
      cursor = next as Node;
    } else {
      // Conflicts with an earlier scalar/array value: keep both by falling back to the literal key.
      addValue(root, rawKey, value, false);
      return;
    }
  }
  addValue(cursor, leaf, value, path.push);
}

export function queryStringToJson(input: string, options: Pick<QueryStringJsonOptions, "nested" | "parseValues">): unknown {
  let text = input.trim();
  const hashIndex = text.indexOf("#");
  if (hashIndex !== -1) text = text.slice(0, hashIndex);
  const qIndex = text.indexOf("?");
  if (qIndex !== -1) text = text.slice(qIndex + 1);
  else if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) text = ""; // URL without a query

  const root = newNode();
  for (const [key, raw] of new URLSearchParams(text)) {
    insert(root, key, options.parseValues ? coerce(raw) : raw, options.nested);
  }
  return root;
}

function stringifyScalar(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function flatten(value: unknown, prefix: string, arrayStyle: "repeat" | "brackets", out: [string, string][]) {
  if (Array.isArray(value)) {
    for (const item of value) {
      const key = arrayStyle === "brackets" ? `${prefix}[]` : prefix;
      if (typeof item === "object" && item !== null) flatten(item, key, arrayStyle, out);
      else out.push([key, stringifyScalar(item)]);
    }
  } else if (typeof value === "object" && value !== null) {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      flatten(v, prefix === "" ? k : `${prefix}[${k}]`, arrayStyle, out);
    }
  } else {
    out.push([prefix, stringifyScalar(value)]);
  }
}

export function jsonToQueryString(input: string, arrayStyle: "repeat" | "brackets"): string {
  const parsed: unknown = JSON.parse(input);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Top-level JSON value must be an object, e.g. {\"page\": 1}.");
  }
  const pairs: [string, string][] = [];
  flatten(parsed, "", arrayStyle, pairs);
  // Brackets stay literal in keys for readability; everything else is percent-encoded.
  const encodeKey = (k: string) => encodeURIComponent(k).replace(/%5B/g, "[").replace(/%5D/g, "]");
  return pairs.map(([k, v]) => `${encodeKey(k)}=${encodeURIComponent(v)}`).join("&");
}

export function convertQueryStringJson(input: string, options: QueryStringJsonOptions): TransformResult {
  if (input.trim().length === 0) return { output: "", error: null };
  try {
    if (options.mode === "qs-to-json") {
      return { output: JSON.stringify(queryStringToJson(input, options), null, 2), error: null };
    }
    return { output: jsonToQueryString(input, options.arrayStyle), error: null };
  } catch (e) {
    return {
      output: "",
      error: { message: e instanceof SyntaxError ? `Invalid JSON: ${e.message}` : e instanceof Error ? e.message : "Could not convert input." },
    };
  }
}

import type { TransformResult } from "@/lib/tool-transform";
import type { JsonPatchToolOptions } from "./schema";

type J = null | boolean | number | string | J[] | { [k: string]: J };
export interface PatchOp { op: "add" | "remove" | "replace" | "move" | "copy" | "test"; path: string; value?: J; from?: string }

export class PatchError extends Error {}

export const parsePointer = (p: string): string[] => {
  if (p === "") return [];
  if (!p.startsWith("/")) throw new PatchError(`Invalid JSON Pointer "${p}" (must start with /)`);
  return p.slice(1).split("/").map((t) => t.replace(/~1/g, "/").replace(/~0/g, "~"));
};
export const escapeToken = (t: string) => t.replace(/~/g, "~0").replace(/\//g, "~1");

const isObj = (v: unknown): v is { [k: string]: J } => typeof v === "object" && v !== null && !Array.isArray(v);
export const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  if (isObj(a) && isObj(b)) { const ka = Object.keys(a), kb = Object.keys(b); return ka.length === kb.length && ka.every((k) => k in b && deepEqual(a[k], b[k])); }
  return false;
}

function idx(token: string, len: number, allowEnd: boolean, path: string): number {
  if (token === "-" && allowEnd) return len;
  if (!/^(0|[1-9]\d*)$/.test(token)) throw new PatchError(`Invalid array index "${token}" in ${path}`);
  const n = Number(token);
  if (n > len || (!allowEnd && n === len)) throw new PatchError(`Array index ${n} out of range in ${path}`);
  return n;
}

function parentOf(doc: J, tokens: string[], path: string): { parent: J; key: string } {
  let cur: J = doc;
  for (const t of tokens.slice(0, -1)) {
    if (Array.isArray(cur)) cur = cur[idx(t, cur.length, false, path)]!;
    else if (isObj(cur) && t in cur) cur = cur[t]!;
    else throw new PatchError(`Path not found: ${path}`);
  }
  return { parent: cur, key: tokens[tokens.length - 1]! };
}

function get(doc: J, path: string): J {
  let cur: J = doc;
  for (const t of parsePointer(path)) {
    if (Array.isArray(cur)) cur = cur[idx(t, cur.length, false, path)]!;
    else if (isObj(cur) && t in cur) cur = cur[t]!;
    else throw new PatchError(`Path not found: ${path}`);
  }
  return cur;
}

function add(doc: J, path: string, value: J): J {
  const tokens = parsePointer(path);
  if (!tokens.length) return value;
  const { parent, key } = parentOf(doc, tokens, path);
  if (Array.isArray(parent)) parent.splice(idx(key, parent.length, true, path), 0, value);
  else if (isObj(parent)) parent[key] = value;
  else throw new PatchError(`Cannot add into a scalar at ${path}`);
  return doc;
}

function remove(doc: J, path: string): { doc: J; removed: J } {
  const tokens = parsePointer(path);
  if (!tokens.length) throw new PatchError("Cannot remove the document root");
  const { parent, key } = parentOf(doc, tokens, path);
  if (Array.isArray(parent)) return { doc, removed: parent.splice(idx(key, parent.length, false, path), 1)[0]! };
  if (isObj(parent) && key in parent) { const removed = parent[key]!; delete parent[key]; return { doc, removed }; }
  throw new PatchError(`Path not found: ${path}`);
}

export function applyPatch(input: J, patch: PatchOp[]): J {
  let doc = clone(input);
  patch.forEach((op, n) => {
    const where = `operation ${n + 1} (${op.op})`;
    try {
      switch (op.op) {
        case "add": doc = add(doc, op.path, clone(op.value as J)); break;
        case "remove": doc = remove(doc, op.path).doc; break;
        case "replace": get(doc, op.path); doc = op.path === "" ? clone(op.value as J) : (remove(doc, op.path), add(doc, op.path, clone(op.value as J))); break;
        case "move": {
          if (op.from === undefined) throw new PatchError('"from" is required');
          if (op.path.startsWith(op.from + "/")) throw new PatchError("Cannot move a value into one of its own children");
          const r = remove(doc, op.from); doc = add(r.doc, op.path, r.removed); break;
        }
        case "copy": if (op.from === undefined) throw new PatchError('"from" is required'); doc = add(doc, op.path, clone(get(doc, op.from))); break;
        case "test": if (!deepEqual(get(doc, op.path), op.value)) throw new PatchError(`Test failed at ${op.path}`); break;
        default: throw new PatchError(`Unknown op "${(op as PatchOp).op}"`);
      }
    } catch (e) {
      if (e instanceof PatchError) throw new PatchError(`${where}: ${e.message}`);
      throw e;
    }
  });
  return doc;
}

/** Produces an RFC 6902 patch turning `a` into `b` (arrays are compared index by index). */
export function diffJson(a: J, b: J, path = ""): PatchOp[] {
  if (deepEqual(a, b)) return [];
  if (isObj(a) && isObj(b)) {
    const ops: PatchOp[] = [];
    for (const k of Object.keys(a)) if (!(k in b)) ops.push({ op: "remove", path: `${path}/${escapeToken(k)}` });
    for (const k of Object.keys(b)) {
      if (!(k in a)) ops.push({ op: "add", path: `${path}/${escapeToken(k)}`, value: b[k]! });
      else ops.push(...diffJson(a[k]!, b[k]!, `${path}/${escapeToken(k)}`));
    }
    return ops;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    const ops: PatchOp[] = [];
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) ops.push(...diffJson(a[i]!, b[i]!, `${path}/${i}`));
    for (let i = a.length - 1; i >= n; i--) ops.push({ op: "remove", path: `${path}/${i}` });
    for (let i = n; i < b.length; i++) ops.push({ op: "add", path: `${path}/${i}`, value: b[i]! });
    return ops;
  }
  return [{ op: "replace", path, value: b }];
}

/** Input: two JSON documents separated by a line containing only `---`. Apply mode: document then patch. Diff mode: before then after. */
export function runJsonPatch(input: string, o: JsonPatchToolOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  const parts = input.split(/^\s*---\s*$/m);
  if (parts.length !== 2) return { output: "", error: { message: "Put a line with only --- between the two JSON documents" } };
  let first: J, second: J;
  try { first = JSON.parse(parts[0]!); } catch (e) { return { output: "", error: { message: `First document: ${(e as Error).message}` } }; }
  try { second = JSON.parse(parts[1]!); } catch (e) { return { output: "", error: { message: `Second document: ${(e as Error).message}` } }; }
  const ind = o.indent || undefined;
  if (o.mode === "diff") return { output: JSON.stringify(diffJson(first, second), null, ind), error: null };
  if (!Array.isArray(second)) return { output: "", error: { message: "The patch (second document) must be a JSON array of operations" } };
  try { return { output: JSON.stringify(applyPatch(first, second as unknown as PatchOp[]), null, ind), error: null }; }
  catch (e) { if (e instanceof PatchError) return { output: "", error: { message: e.message } }; throw e; }
}

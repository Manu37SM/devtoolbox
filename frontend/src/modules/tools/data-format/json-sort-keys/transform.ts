import type { TransformResult } from "@/lib/tool-transform";
import type { JsonSortKeysOptions } from "./schema";

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

function cmpKeys(o: JsonSortKeysOptions): (a: string, b: string) => number {
  const norm = (s: string) => (o.caseInsensitive ? s.toLowerCase() : s);
  const base = (a: string, b: string) => (norm(a) < norm(b) ? -1 : norm(a) > norm(b) ? 1 : 0);
  switch (o.order) {
    case "desc": return (a, b) => base(b, a);
    case "length": return (a, b) => a.length - b.length || base(a, b);
    case "natural": return (a, b) => collator.compare(a, b) || base(a, b);
    default: return base;
  }
}

const typeRank = (v: Json) => (v === null ? 0 : typeof v === "boolean" ? 1 : typeof v === "number" ? 2 : typeof v === "string" ? 3 : Array.isArray(v) ? 4 : 5);

export function sortJson(v: Json, o: JsonSortKeysOptions, top = true): Json {
  const cmp = cmpKeys(o);
  if (Array.isArray(v)) {
    const items = o.deep || top ? v.map((x) => (o.deep ? sortJson(x, o, false) : x)) : v;
    if (o.sortArrays) return [...items].sort((a, b) => typeRank(a) - typeRank(b) || (typeof a === "object" || a === null ? JSON.stringify(a).localeCompare(JSON.stringify(b)) : (a as string | number) < (b as string | number) ? -1 : (a as string | number) > (b as string | number) ? 1 : 0));
    return items;
  }
  if (v !== null && typeof v === "object") {
    const out: { [k: string]: Json } = {};
    for (const k of Object.keys(v).sort(cmp)) {
      if (k === "__proto__") Object.defineProperty(out, k, { value: o.deep ? sortJson(v[k]!, o, false) : v[k]!, enumerable: true, writable: true, configurable: true });
      else out[k] = o.deep ? sortJson(v[k]!, o, false) : v[k]!;
    }
    return out;
  }
  return v;
}

export function runJsonSortKeys(input: string, o: JsonSortKeysOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  let data: Json;
  try { data = JSON.parse(input); } catch (e) { return { output: "", error: { message: `Invalid JSON: ${(e as Error).message}` } }; }
  const space = o.indent === "tab" ? "\t" : o.indent === "min" ? undefined : Number(o.indent);
  return { output: JSON.stringify(sortJson(data, o), null, space), error: null };
}

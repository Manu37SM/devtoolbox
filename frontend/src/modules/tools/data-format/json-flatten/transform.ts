import type { TransformResult } from "@/lib/tool-transform";
import type { JsonFlattenOptions } from "./schema";

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
const isObj = (v: unknown): v is { [k: string]: Json } => typeof v === "object" && v !== null && !Array.isArray(v);

export function flatten(value: Json, delimiter: string, arrays: "brackets" | "delimited"): Record<string, Json> {
  const out: Record<string, Json> = {};
  const walk = (v: Json, path: string) => {
    if (Array.isArray(v) && v.length) {
      v.forEach((item, i) => walk(item, arrays === "brackets" ? `${path}[${i}]` : path ? `${path}${delimiter}${i}` : String(i)));
    } else if (isObj(v) && Object.keys(v).length) {
      for (const [k, item] of Object.entries(v)) walk(item, path ? `${path}${delimiter}${k}` : k);
    } else {
      out[path] = v; // primitives, empty {} and empty []
    }
  };
  walk(value, "");
  return out;
}

/** Splits a flat key into path segments; numeric segments (or [n]) become array indexes. */
export function splitKey(key: string, delimiter: string, arrays: "brackets" | "delimited"): (string | number)[] {
  const segs: (string | number)[] = [];
  for (const part of key.split(delimiter)) {
    if (arrays === "brackets") {
      const m = /^(.*?)((?:\[\d+\])+)$/.exec(part);
      if (m) {
        if (m[1]) segs.push(m[1]);
        for (const idx of m[2]!.matchAll(/\[(\d+)\]/g)) segs.push(Number(idx[1]));
        continue;
      }
      segs.push(part);
    } else segs.push(/^\d+$/.test(part) ? Number(part) : part);
  }
  return segs;
}

export function unflatten(flat: Record<string, Json>, delimiter: string, arrays: "brackets" | "delimited"): Json {
  let root: Json = null;
  for (const [key, val] of Object.entries(flat)) {
    const segs = splitKey(key, delimiter, arrays);
    if (!segs.length || (segs.length === 1 && segs[0] === "")) { root = val; continue; }
    if (root === null || typeof root !== "object") root = typeof segs[0] === "number" ? [] : {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let cur: any = root;
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i]!;
      if (s === "__proto__" || s === "constructor" || s === "prototype") throw new Error(`Refusing unsafe key segment "${s}"`);
      const last = i === segs.length - 1;
      if (last) { cur[s] = val; break; }
      const nextIsIdx = typeof segs[i + 1] === "number";
      if (cur[s] === undefined || cur[s] === null || typeof cur[s] !== "object") cur[s] = nextIsIdx ? [] : {};
      cur = cur[s];
    }
  }
  return root;
}

export function runJsonFlatten(input: string, o: JsonFlattenOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  let data: Json;
  try { data = JSON.parse(input); } catch (e) { return { output: "", error: { message: `Invalid JSON: ${(e as Error).message}` } }; }
  const space = o.indent === "tab" ? "\t" : o.indent === "min" ? undefined : Number(o.indent);
  try {
    if (o.direction === "flatten") {
      if (typeof data !== "object" || data === null) return { output: JSON.stringify(data), error: null };
      return { output: JSON.stringify(flatten(data, o.delimiter, o.arrays), null, space), error: null };
    }
    if (!isObj(data)) return { output: "", error: { message: "Unflatten expects a JSON object of path → value" } };
    return { output: JSON.stringify(unflatten(data, o.delimiter, o.arrays), null, space), error: null };
  } catch (e) {
    return { output: "", error: { message: (e as Error).message } };
  }
}

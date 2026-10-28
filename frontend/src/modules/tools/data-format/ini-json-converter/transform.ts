import type { TransformResult } from "@/lib/tool-transform";
import type { IniJsonConverterOptions } from "./schema";

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
type Obj = { [k: string]: Json };
const UNSAFE = new Set(["__proto__", "constructor", "prototype"]);

function coerce(raw: string, infer: boolean): Json {
  let v = raw.trim();
  const q = /^(["'])(.*)\1$/s.exec(v);
  if (q) return q[1] === '"' ? q[2]!.replace(/\\(["\\nt])/g, (_, c) => (c === "n" ? "\n" : c === "t" ? "\t" : c)) : q[2]!;
  v = v.replace(/\s+[;#].*$/, "");
  if (!infer) return v;
  if (/^(true|yes|on)$/i.test(v)) return true;
  if (/^(false|no|off)$/i.test(v)) return false;
  if (/^null$/i.test(v)) return null;
  if (/^-?(0|[1-9]\d*)(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

function ensure(parent: Obj, key: string): Obj {
  if (UNSAFE.has(key)) throw new Error(`Refusing unsafe key "${key}"`);
  const cur = parent[key];
  if (cur === undefined) { const o: Obj = {}; parent[key] = o; return o; }
  if (typeof cur !== "object" || cur === null || Array.isArray(cur)) throw new Error(`Section "${key}" conflicts with a key of the same name`);
  return cur;
}

export function parseIni(text: string, infer: boolean, nest: boolean): Obj {
  const root: Obj = {};
  let section: Obj = root;
  const lines = text.split(/\r?\n/);
  for (const [i, raw] of lines.entries()) {
    const line = raw.trim();
    if (!line || line.startsWith(";") || line.startsWith("#")) continue;
    const sec = /^\[([^\]]+)\]\s*(?:[;#].*)?$/.exec(line);
    if (sec) {
      const name = sec[1]!.trim();
      try {
        if (nest) { section = root; for (const p of name.split(".")) section = ensure(section, p.trim()); }
        else section = ensure(root, name);
      } catch (e) { throw Object.assign(new Error((e as Error).message), { line: i + 1 }); }
      continue;
    }
    const kv = /^([^=:]+?)\s*[=:]\s*(.*)$/.exec(line);
    if (!kv) throw Object.assign(new Error(`Cannot parse line: "${line}"`), { line: i + 1 });
    const key = kv[1]!.trim();
    if (UNSAFE.has(key)) throw Object.assign(new Error(`Refusing unsafe key "${key}"`), { line: i + 1 });
    const val = coerce(kv[2]!, infer);
    const existing = section[key];
    if (key.endsWith("[]")) {
      const k = key.slice(0, -2);
      const arr = Array.isArray(section[k]) ? (section[k] as Json[]) : [];
      arr.push(val); section[k] = arr;
    } else if (existing === undefined) section[key] = val;
    else if (Array.isArray(existing)) existing.push(val);
    else section[key] = [existing, val];
  }
  return root;
}

const fmt = (v: Json): string => {
  if (v === null) return "null";
  if (typeof v === "string") return /^\s|\s$|[;#"\n]|^(true|false|null|yes|no|on|off|-?\d+(\.\d+)?)$/i.test(v) ? JSON.stringify(v) : v;
  return String(v);
};

export function stringifyIni(obj: Obj): string {
  const out: string[] = [];
  const emitKeys = (o: Obj) => {
    for (const [k, v] of Object.entries(o)) {
      if (Array.isArray(v)) v.forEach((item) => { if (typeof item === "object" && item !== null) throw new Error(`INI cannot represent objects inside the array "${k}"`); out.push(`${k}[] = ${fmt(item)}`); });
      else if (typeof v !== "object" || v === null) out.push(`${k} = ${fmt(v)}`);
    }
  };
  const emitSections = (o: Obj, prefix: string) => {
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === "object" && v !== null && !Array.isArray(v)) {
        const name = prefix ? `${prefix}.${k}` : k;
        if (out.length) out.push("");
        out.push(`[${name}]`);
        emitKeys(v);
        emitSections(v, name);
      }
    }
  };
  emitKeys(obj);
  emitSections(obj, "");
  return out.join("\n") + (out.length ? "\n" : "");
}

export function runIniJson(input: string, o: IniJsonConverterOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  const space = o.indent === "tab" ? "\t" : o.indent === "min" ? undefined : Number(o.indent);
  try {
    if (o.direction === "ini-to-json") return { output: JSON.stringify(parseIni(input, o.inferTypes, o.nestDotted), null, space), error: null };
    let data: Json;
    try { data = JSON.parse(input); } catch (e) { return { output: "", error: { message: `Invalid JSON: ${(e as Error).message}` } }; }
    if (typeof data !== "object" || data === null || Array.isArray(data)) return { output: "", error: { message: "JSON root must be an object" } };
    return { output: stringifyIni(data), error: null };
  } catch (e) {
    const line = (e as { line?: number }).line;
    return { output: "", error: { message: (e as Error).message, ...(line ? { line } : {}) } };
  }
}

import type { TransformResult } from "@/lib/tool-transform";
import type { JsonToGoPythonOptions } from "./schema";

type T =
  | { k: "string" | "int" | "float" | "bool" | "null" | "any"; nullable?: boolean }
  | { k: "array"; of: T; nullable?: boolean }
  | { k: "object"; fields: Map<string, { t: T; optional: boolean }>; nullable?: boolean };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export function infer(v: unknown): T {
  if (v === null) return { k: "null" };
  if (typeof v === "string") return { k: "string" };
  if (typeof v === "boolean") return { k: "bool" };
  if (typeof v === "number") return { k: Number.isInteger(v) ? "int" : "float" };
  if (Array.isArray(v)) return { k: "array", of: v.length ? v.map(infer).reduce(merge) : { k: "any" } };
  if (isObj(v)) {
    const fields = new Map<string, { t: T; optional: boolean }>();
    for (const [key, val] of Object.entries(v)) fields.set(key, { t: infer(val), optional: false });
    return { k: "object", fields };
  }
  return { k: "any" };
}

export function merge(a: T, b: T): T {
  if (a.k === "null") return b.k === "null" ? a : { ...b, nullable: true };
  if (b.k === "null") return merge(b, a);
  if (a.k === "object" && b.k === "object") {
    const fields = new Map<string, { t: T; optional: boolean }>();
    for (const [k, f] of a.fields) { const g = b.fields.get(k); fields.set(k, g ? { t: merge(f.t, g.t), optional: f.optional || g.optional } : { t: f.t, optional: true }); }
    for (const [k, g] of b.fields) if (!a.fields.has(k)) fields.set(k, { t: g.t, optional: true });
    return { k: "object", fields };
  }
  if (a.k === "array" && b.k === "array") return { k: "array", of: merge(a.of, b.of) };
  if (a.k === b.k) return a;
  if ((a.k === "int" && b.k === "float") || (a.k === "float" && b.k === "int")) return { k: "float" };
  return { k: "any" };
}

const INITIALISMS = new Set(["id", "url", "uri", "api", "http", "https", "html", "json", "xml", "sql", "uuid", "ip", "ui", "cpu", "ssh", "tls", "ttl", "css", "dns", "tcp", "udp", "uid"]);
const words = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, "$1 $2").split(/[^A-Za-z0-9]+/).filter(Boolean);
export const pascal = (s: string) => { const w = words(s).map((x) => (INITIALISMS.has(x.toLowerCase()) ? x.toUpperCase() : x[0]!.toUpperCase() + x.slice(1).toLowerCase())).join(""); return /^\d/.test(w) ? "N" + w : w || "Field"; };
const PY_KEYWORDS = new Set(["False", "None", "True", "and", "as", "assert", "async", "await", "break", "class", "continue", "def", "del", "elif", "else", "except", "finally", "for", "from", "global", "if", "import", "in", "is", "lambda", "nonlocal", "not", "or", "pass", "raise", "return", "try", "while", "with", "yield"]);
const snake = (s: string) => { const w = words(s).map((x) => x.toLowerCase()).join("_"); const r = /^\d/.test(w) ? "f_" + w : w || "field"; return PY_KEYWORDS.has(r) ? r + "_" : r; };
const singular = (s: string) => (/ies$/i.test(s) ? s.slice(0, -3) + "y" : /(ss|us)$/i.test(s) ? s : /s$/i.test(s) ? s.slice(0, -1) : s);

interface Ctx { defs: string[]; names: Set<string>; o: JsonToGoPythonOptions }

function uniqueName(ctx: Ctx, base: string): string {
  let n = base, i = 2;
  while (ctx.names.has(n)) n = base + i++;
  ctx.names.add(n);
  return n;
}

function goType(t: T, hint: string, ctx: Ctx): string {
  let s: string;
  switch (t.k) {
    case "string": s = "string"; break;
    case "int": s = "int64"; break;
    case "float": s = "float64"; break;
    case "bool": s = "bool"; break;
    case "array": s = "[]" + goType(t.of, singular(hint), ctx); break;
    case "object": {
      const name = uniqueName(ctx, pascal(hint));
      const used = new Set<string>();
      const lines = [...t.fields].map(([key, f]) => {
        let fn = pascal(key); while (used.has(fn)) fn += "_"; used.add(fn);
        const ft = goType(f.t, key, ctx);
        const nullable = (f.t as { nullable?: boolean }).nullable || f.t.k === "null";
        const ptr = ctx.o.pointerForNullable && (f.optional || nullable) && !ft.startsWith("[]") && !ft.startsWith("map") && ft !== "interface{}" ? "*" : "";
        const tag = `json:"${key}${ctx.o.omitEmpty && (f.optional || nullable) ? ",omitempty" : ""}"`;
        return { fn, type: ptr + ft, tag: `\`${tag}\`` };
      });
      const wn = Math.max(0, ...lines.map((l) => l.fn.length));
      const wt = Math.max(0, ...lines.map((l) => l.type.length));
      ctx.defs.unshift(`type ${name} struct {\n${lines.map((l) => "\t" + l.fn.padEnd(wn) + " " + l.type.padEnd(wt) + " " + l.tag).join("\n")}\n}`);
      return name;
    }
    default: s = "interface{}";
  }
  return s;
}

function pyType(t: T, hint: string, ctx: Ctx): string {
  let s: string;
  switch (t.k) {
    case "string": s = "str"; break;
    case "int": s = "int"; break;
    case "float": s = "float"; break;
    case "bool": s = "bool"; break;
    case "null": return "None";
    case "array": s = `list[${pyType(t.of, singular(hint), ctx)}]`; break;
    case "object": {
      const name = uniqueName(ctx, pascal(hint));
      const target = ctx.o.target;
      const fields = [...t.fields].map(([key, f]) => {
        const nullable = (f.t as { nullable?: boolean }).nullable;
        const ft = pyType(f.t, key, ctx);
        const type = (f.optional || nullable) && ft !== "None" ? `${ft} | None` : ft;
        return { key, py: snake(key), type, optional: f.optional || !!nullable };
      });
      const head = target === "python-dataclass" ? `@dataclass\nclass ${name}:` : target === "python-pydantic" ? `class ${name}(BaseModel):` : `class ${name}(TypedDict):`;
      // dataclass fields without defaults must precede those with defaults
      const ordered = target === "python-typeddict" ? fields : [...fields.filter((f) => !f.optional), ...fields.filter((f) => f.optional)];
      const body = ordered.map((f) => {
        const alias = f.py !== f.key && target === "python-pydantic" ? ` = Field(${f.optional ? "default=None, " : ""}alias="${f.key}")` : f.optional && target !== "python-typeddict" ? " = None" : "";
        return `    ${f.py}: ${f.type}${alias}`;
      });
      ctx.defs.push(`${head}\n${body.length ? body.join("\n") : "    pass"}`);
      if (target === "python-dataclass" && fields.some((f) => f.py !== f.key)) ctx.defs[ctx.defs.length - 1] += `\n    # JSON keys differ from field names: ${fields.filter((f) => f.py !== f.key).map((f) => `${f.py} <- "${f.key}"`).join(", ")}`;
      return name;
    }
    default: return "Any";
  }
  return s;
}

/** Input: JSON, optionally preceded by a line `name: Root`. */
export function jsonToGoPython(input: string, o: JsonToGoPythonOptions): TransformResult {
  let text = input;
  let root = "Root";
  const nm = /^\s*name\s*:\s*([A-Za-z_]\w*)\s*\r?\n/.exec(text);
  if (nm) { root = nm[1]!; text = text.slice(nm[0].length); }
  if (!text.trim()) return { output: "", error: null };
  let data: unknown;
  try { data = JSON.parse(text); } catch (e) { return { output: "", error: { message: `Invalid JSON: ${(e as Error).message}` } }; }
  const t = infer(data);
  const ctx: Ctx = { defs: [], names: new Set(), o };
  if (o.target === "go") {
    const top = goType(t, root, ctx);
    const defs = ctx.defs.length ? ctx.defs.join("\n\n") : `type ${pascal(root)} ${top}`;
    return { output: `package main\n\n${defs}\n`, error: null };
  }
  const top = pyType(t, root, ctx);
  const header = o.target === "python-dataclass" ? "from __future__ import annotations\nfrom dataclasses import dataclass\n" : o.target === "python-pydantic" ? "from __future__ import annotations\nfrom pydantic import BaseModel" + (ctx.defs.join("\n").includes("Field(") ? ", Field" : "") + "\n" : "from __future__ import annotations\nfrom typing import TypedDict\n";
  const needsAny = ctx.defs.join("\n").includes("Any") || top === "Any" || top.includes("Any");
  const imports = header.replace(/\n$/, "") + (needsAny ? "\nfrom typing import Any" : "") + "\n";
  const body = ctx.defs.length ? ctx.defs.join("\n\n\n") : `${pascal(root)} = ${top}`;
  return { output: `${imports}\n\n${body}\n`, error: null };
}

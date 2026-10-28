import type { TransformResult } from "@/lib/tool-transform";
import type { JsonToZodOptions } from "./schema";

type Fmt = "email" | "uuid" | "url" | "datetime" | "date" | "ipv4" | undefined;
type T =
  | { k: "string"; fmt?: Fmt; nullable?: boolean }
  | { k: "int" | "float" | "bool" | "any"; nullable?: boolean }
  | { k: "null" }
  | { k: "array"; of: T; nullable?: boolean }
  | { k: "object"; fields: Map<string, { t: T; optional: boolean }>; nullable?: boolean };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function strFmt(s: string): Fmt {
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return "email";
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)) return "uuid";
  if (/^https?:\/\/[^\s]+$/.test(s)) return "url";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(s)) return "datetime";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return "date";
  if (/^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(s)) return "ipv4";
  return undefined;
}

export function infer(v: unknown): T {
  if (v === null) return { k: "null" };
  if (typeof v === "string") return { k: "string", fmt: strFmt(v) };
  if (typeof v === "boolean") return { k: "bool" };
  if (typeof v === "number") return { k: Number.isInteger(v) ? "int" : "float" };
  if (Array.isArray(v)) return { k: "array", of: v.length ? v.map(infer).reduce(merge) : { k: "any" } };
  if (isObj(v)) return { k: "object", fields: new Map(Object.entries(v).map(([k, x]) => [k, { t: infer(x), optional: false }])) };
  return { k: "any" };
}

export function merge(a: T, b: T): T {
  if (a.k === "null") return b.k === "null" ? a : { ...b, nullable: true };
  if (b.k === "null") return merge(b, a);
  const nullable = a.nullable || b.nullable || undefined;
  if (a.k === "object" && b.k === "object") {
    const fields = new Map<string, { t: T; optional: boolean }>();
    for (const [k, f] of a.fields) { const g = b.fields.get(k); fields.set(k, g ? { t: merge(f.t, g.t), optional: f.optional || g.optional } : { t: f.t, optional: true }); }
    for (const [k, g] of b.fields) if (!a.fields.has(k)) fields.set(k, { t: g.t, optional: true });
    return { k: "object", fields, nullable };
  }
  if (a.k === "array" && b.k === "array") return { k: "array", of: merge(a.of, b.of), nullable };
  if (a.k === "string" && b.k === "string") return { k: "string", fmt: a.fmt === b.fmt ? a.fmt : undefined, nullable };
  if (a.k === b.k && a.k !== "object" && a.k !== "array") return { k: a.k, nullable } as T;
  if ((a.k === "int" && b.k === "float") || (a.k === "float" && b.k === "int")) return { k: "float", nullable };
  return { k: "any", nullable };
}

const camel = (s: string) => { const w = s.replace(/([a-z0-9])([A-Z])/g, "$1 $2").split(/[^A-Za-z0-9]+/).filter(Boolean); const r = w.map((x, i) => (i ? x[0]!.toUpperCase() + x.slice(1).toLowerCase() : x.toLowerCase())).join(""); return /^\d/.test(r) ? "_" + r : r || "field"; };
const singular = (s: string) => (/ies$/i.test(s) ? s.slice(0, -3) + "y" : /(ss|us)$/i.test(s) ? s : /s$/i.test(s) ? s.slice(0, -1) : s);
const key = (k: string) => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k));

interface Ctx { defs: string[]; names: Set<string>; o: JsonToZodOptions }

function expr(t: T, hint: string, ctx: Ctx, depth: number): string {
  let s: string;
  switch (t.k) {
    case "string": s = ctx.o.detectFormats && t.fmt ? ({ email: "z.email()", uuid: "z.uuid()", url: "z.url()", datetime: "z.iso.datetime()", date: "z.iso.date()", ipv4: "z.ipv4()" } as const)[t.fmt] : "z.string()"; break;
    case "int": s = "z.number().int()"; break;
    case "float": s = "z.number()"; break;
    case "bool": s = "z.boolean()"; break;
    case "null": return "z.null()";
    case "any": s = "z.unknown()"; break;
    case "array": s = `z.array(${expr(t.of, singular(hint), ctx, depth)})`; break;
    case "object": {
      const pad = "  ".repeat(depth + 1);
      const fields = [...t.fields].map(([k, f]) => {
        let e = expr(f.t, k, ctx, depth + 1);
        if (f.optional) e += ".optional()";
        return `${pad}${key(k)}: ${e},`;
      });
      const body = fields.length ? `z.${ctx.o.strict ? "strictObject" : "object"}({\n${fields.join("\n")}\n${"  ".repeat(depth)}})` : `z.${ctx.o.strict ? "strictObject" : "object"}({})`;
      if (ctx.o.style === "inline") s = body;
      else {
        let n = camel(hint) + "Schema", i = 2;
        while (ctx.names.has(n)) n = camel(hint) + "Schema" + i++;
        ctx.names.add(n);
        // named objects are emitted at top level: re-render at depth 0
        const flat = renderTop(t, hint, ctx);
        ctx.defs.push(`const ${n} = ${flat};`);
        return n + (t.nullable ? ".nullable()" : "");
      }
      break;
    }
  }
  return t.nullable ? s + ".nullable()" : s;
}

function renderTop(t: Extract<T, { k: "object" }>, hint: string, ctx: Ctx): string {
  const fields = [...t.fields].map(([k, f]) => {
    let e = expr(f.t, k, ctx, 1);
    if (f.optional) e += ".optional()";
    return `  ${key(k)}: ${e},`;
  });
  return `z.${ctx.o.strict ? "strictObject" : "object"}({${fields.length ? "\n" + fields.join("\n") + "\n" : ""}})`;
}

/** Input: JSON, optionally preceded by a line `name: user` (schema variable name). */
export function jsonToZod(input: string, o: JsonToZodOptions): TransformResult {
  let text = input, root = "root";
  const nm = /^\s*name\s*:\s*([A-Za-z_]\w*)\s*\r?\n/.exec(text);
  if (nm) { root = nm[1]!; text = text.slice(nm[0].length); }
  if (!text.trim()) return { output: "", error: null };
  let data: unknown;
  try { data = JSON.parse(text); } catch (e) { return { output: "", error: { message: `Invalid JSON: ${(e as Error).message}` } }; }
  const ctx: Ctx = { defs: [], names: new Set(), o };
  const rootName = camel(root) + "Schema";
  ctx.names.add(rootName);
  const t = infer(data);
  let top: string;
  if (t.k === "object") top = o.style === "inline" ? expr(t, root, ctx, 0) : renderTop(t, root, ctx);
  else top = expr(t, root, ctx, 0);
  const lines = ['import { z } from "zod";', "", ...ctx.defs.flatMap((d) => [d, ""]), `export const ${rootName} = ${top};`];
  if (o.exportTypes) lines.push("", `export type ${root[0]!.toUpperCase() + root.slice(1)} = z.infer<typeof ${rootName}>;`);
  return { output: lines.join("\n") + "\n", error: null };
}

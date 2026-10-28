import type { TransformResult } from "@/lib/tool-transform";
import type { JsonToKotlinSwiftOptions } from "./schema";

type T =
  | { k: "string" | "int" | "float" | "bool" | "any"; nullable?: boolean }
  | { k: "null" }
  | { k: "array"; of: T; nullable?: boolean }
  | { k: "object"; fields: Map<string, { t: T; optional: boolean }>; nullable?: boolean };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export function infer(v: unknown): T {
  if (v === null) return { k: "null" };
  if (typeof v === "string") return { k: "string" };
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
  if (a.k === b.k && a.k !== "object" && a.k !== "array") return { k: a.k, nullable };
  if ((a.k === "int" && b.k === "float") || (a.k === "float" && b.k === "int")) return { k: "float", nullable };
  return { k: "any", nullable };
}

const words = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, "$1 $2").split(/[^A-Za-z0-9]+/).filter(Boolean);
const pascal = (s: string) => { const r = words(s).map((x) => x[0]!.toUpperCase() + x.slice(1).toLowerCase()).join(""); return /^\d/.test(r) ? "N" + r : r || "Field"; };
const camel = (s: string) => { const p = pascal(s); return p[0]!.toLowerCase() + p.slice(1); };
const singular = (s: string) => (/ies$/i.test(s) ? s.slice(0, -3) + "y" : /(ss|us)$/i.test(s) ? s : /s$/i.test(s) ? s.slice(0, -1) : s);

const KOTLIN_KW = new Set(["as", "break", "class", "continue", "do", "else", "false", "for", "fun", "if", "in", "interface", "is", "null", "object", "package", "return", "super", "this", "throw", "true", "try", "typealias", "typeof", "val", "var", "when", "while"]);
const SWIFT_KW = new Set(["associatedtype", "class", "deinit", "enum", "extension", "fileprivate", "func", "import", "init", "inout", "internal", "let", "open", "operator", "private", "protocol", "public", "rethrows", "static", "struct", "subscript", "typealias", "var", "break", "case", "continue", "default", "defer", "do", "else", "fallthrough", "for", "guard", "if", "in", "repeat", "return", "switch", "where", "while", "as", "false", "is", "nil", "self", "super", "throw", "throws", "true", "try"]);

interface Ctx { defs: string[]; names: Set<string>; o: JsonToKotlinSwiftOptions; swift: boolean }

function unique(ctx: Ctx, base: string) { let n = base, i = 2; while (ctx.names.has(n)) n = base + i++; ctx.names.add(n); return n; }

function typeOf(t: T, hint: string, ctx: Ctx): string {
  const { swift } = ctx;
  let s: string;
  switch (t.k) {
    case "string": s = "String"; break;
    case "int": s = swift ? "Int" : "Long"; break;
    case "float": s = "Double"; break;
    case "bool": s = swift ? "Bool" : "Boolean"; break;
    case "null": return swift ? "String?" : "Any?";
    case "any": s = swift ? "AnyCodable" : ctx.o.target === "kotlin-serialization" ? "JsonElement" : "Any"; break;
    case "array": s = swift ? `[${typeOf(t.of, singular(hint), ctx)}]` : `List<${typeOf(t.of, singular(hint), ctx)}>`; break;
    case "object": {
      const name = unique(ctx, pascal(hint));
      const fields = [...t.fields].map(([key, f]) => {
        const base = typeOf(f.t, key, ctx);
        const opt = f.optional || (f.t as { nullable?: boolean }).nullable || f.t.k === "null";
        let id = camel(key);
        if ((swift ? SWIFT_KW : KOTLIN_KW).has(id)) id = "`" + id + "`";
        return { key, id, type: opt && !base.endsWith("?") ? base + "?" : base, opt: !!opt };
      });
      if (swift) {
        const needKeys = fields.some((f) => f.id.replace(/`/g, "") !== f.key);
        const body = fields.map((f) => `    let ${f.id}: ${f.type}`);
        const keys = needKeys ? ["", "    enum CodingKeys: String, CodingKey {", ...fields.map((f) => (f.id.replace(/`/g, "") === f.key ? `        case ${f.id}` : `        case ${f.id} = "${f.key}"`)), "    }"] : [];
        ctx.defs.unshift(`struct ${name}: Codable {\n${[...body, ...keys].join("\n")}\n}`);
      } else {
        const tgt = ctx.o.target;
        const params = fields.map((f) => {
          const ann = f.id.replace(/`/g, "") !== f.key ? (tgt === "kotlin-serialization" ? `@SerialName("${f.key}") ` : tgt === "kotlin-jackson" ? `@JsonProperty("${f.key}") ` : "") : "";
          return `    ${ann}val ${f.id}: ${f.type}${f.opt && ctx.o.optionalDefaults ? " = null" : ""}`;
        });
        const head = tgt === "kotlin-serialization" ? "@Serializable\n" : "";
        ctx.defs.unshift(`${head}data class ${name}(\n${params.join(",\n")}\n)`);
      }
      return name;
    }
  }
  return s;
}

/** Input: JSON, optionally preceded by a line `name: Root`. */
export function jsonToKotlinSwift(input: string, o: JsonToKotlinSwiftOptions): TransformResult {
  let text = input, root = "Root";
  const nm = /^\s*name\s*:\s*([A-Za-z_]\w*)\s*\r?\n/.exec(text);
  if (nm) { root = nm[1]!; text = text.slice(nm[0].length); }
  if (!text.trim()) return { output: "", error: null };
  let data: unknown;
  try { data = JSON.parse(text); } catch (e) { return { output: "", error: { message: `Invalid JSON: ${(e as Error).message}` } }; }
  const swift = o.target === "swift-codable";
  const ctx: Ctx = { defs: [], names: new Set(), o, swift };
  const t = infer(data);
  const top = typeOf(t, root, ctx);
  const body = ctx.defs.length ? ctx.defs.join("\n\n") : `typealias ${pascal(root)} = ${top}`;
  const all = ctx.defs.join("\n") + top;
  let header: string;
  if (swift) header = "import Foundation" + (all.includes("AnyCodable") ? "\n\n// AnyCodable: use a package such as Flight-School/AnyCodable, or replace with a concrete type" : "");
  else if (o.target === "kotlin-serialization") header = "import kotlinx.serialization.SerialName\nimport kotlinx.serialization.Serializable" + (all.includes("JsonElement") ? "\nimport kotlinx.serialization.json.JsonElement" : "");
  else if (o.target === "kotlin-jackson") header = all.includes("@JsonProperty") ? "import com.fasterxml.jackson.annotation.JsonProperty" : "";
  else header = "";
  if (o.target === "kotlin-serialization" && !all.includes("@SerialName")) header = header.replace("import kotlinx.serialization.SerialName\n", "");
  return { output: (header ? header + "\n\n" : "") + body + "\n", error: null };
}

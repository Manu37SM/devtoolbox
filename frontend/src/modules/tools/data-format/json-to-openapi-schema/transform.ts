import { dump } from "js-yaml";
import type { TransformResult } from "@/lib/tool-transform";
import type { JsonToOpenapiSchemaOptions } from "./schema";

type S = Record<string, unknown>;
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
export const pascal = (s: string) => s.replace(/[^A-Za-z0-9]+(.)?/g, (_, c: string | undefined) => (c ? c.toUpperCase() : "")).replace(/^./, (c) => c.toUpperCase()) || "Model";
const singular = (s: string) => (/ies$/i.test(s) ? s.replace(/ies$/i, "y") : /(ss|us)$/i.test(s) ? s : s.replace(/s$/i, ""));

export function detectFormat(s: string): string | undefined {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/i.test(s)) return "date-time";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return "date";
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)) return "uuid";
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return "email";
  if (/^https?:\/\/\S+$/i.test(s)) return "uri";
  return undefined;
}

class Builder {
  components = new Map<string, S>();
  constructor(private o: JsonToOpenapiSchemaOptions) {}

  private nullable(): S { return this.o.version === "3.1" ? { type: ["string", "null"], description: "Inferred from a null sample" } : { type: "string", nullable: true, description: "Inferred from a null sample" }; }

  private example(s: S, v: unknown): S {
    if (!this.o.includeExamples || v === null || typeof v === "object") return s;
    return this.o.version === "3.1" ? { ...s, examples: [v] } : { ...s, example: v };
  }

  infer(v: unknown, nameHint: string): S {
    if (v === null) return this.nullable();
    if (typeof v === "boolean") return this.example({ type: "boolean" }, v);
    if (typeof v === "number") {
      if (Number.isInteger(v)) return this.example({ type: "integer", format: Math.abs(v) > 2147483647 ? "int64" : "int32" }, v);
      return this.example({ type: "number", format: "double" }, v);
    }
    if (typeof v === "string") { const f = detectFormat(v); return this.example(f ? { type: "string", format: f } : { type: "string" }, v); }
    if (Array.isArray(v)) {
      if (v.length === 0) return { type: "array", items: {} };
      if (v.every(isObj)) return { type: "array", items: this.objectRef(mergeObjects(v as Record<string, unknown>[]), singular(nameHint), v as Record<string, unknown>[]) };
      const schemas = v.map((x) => this.infer(x, nameHint));
      const distinct = schemas.filter((s, i) => schemas.findIndex((o) => o.type === s.type && o.format === s.format) === i).map((s) => stripExample(s));
      return { type: "array", items: distinct.length === 1 ? distinct[0]! : { oneOf: distinct } };
    }
    return this.objectRef(v as Record<string, unknown>, nameHint, [v as Record<string, unknown>]);
  }

  /** Builds an object schema, registers it as a component and returns a $ref. */
  objectRef(sample: Record<string, unknown>, nameHint: string, all: Record<string, unknown>[]): S {
    const schema = this.objectSchema(sample, all);
    let name = pascal(nameHint);
    let n = 2;
    while (this.components.has(name) && JSON.stringify(this.components.get(name)) !== JSON.stringify(schema)) name = `${pascal(nameHint)}${n++}`;
    this.components.set(name, schema);
    return { $ref: `#/components/schemas/${name}` };
  }

  objectSchema(sample: Record<string, unknown>, all: Record<string, unknown>[]): S {
    const properties: S = {};
    for (const [k, val] of Object.entries(sample)) properties[k] = this.infer(val, k);
    const required = Object.keys(sample).filter((k) => all.every((o) => k in o && o[k] !== null));
    return { type: "object", ...(required.length ? { required } : {}), properties };
  }
}

function stripExample(s: S): S {
  const rest = { ...s };
  delete rest.example;
  delete rest.examples;
  return rest;
}

/** Union of keys across array elements; the first non-null sample of each key wins. */
export function mergeObjects(list: Record<string, unknown>[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const o of list) for (const [k, v] of Object.entries(o)) if (!(k in out) || (out[k] === null && v !== null)) out[k] = v;
  return out;
}

export function runJsonToOpenapiSchema(input: string, options: JsonToOpenapiSchemaOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  let text = input;
  let name = "Model";
  let path = "/models";
  const header = /^\s*((?:name|path)\s*:\s*\S+\s*\n)+/i.exec(input);
  if (header) {
    for (const line of header[0].split("\n")) {
      const m = /^\s*(name|path)\s*:\s*(\S+)/i.exec(line);
      if (m?.[1]!.toLowerCase() === "name") name = m[2]!;
      if (m?.[1]!.toLowerCase() === "path") path = m[2]!.startsWith("/") ? m[2]! : `/${m[2]}`;
    }
    text = input.slice(header[0].length);
    if (!/^path/im.test(header[0])) path = `/${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}s`;
  }
  let data: unknown;
  try { data = JSON.parse(text); } catch (e) { return { output: "", error: { message: `Invalid JSON: ${(e as Error).message}` } }; }
  const b = new Builder(options);
  const root = isObj(data) ? b.objectRef(data, name, [data]) : b.infer(data, name);
  const schemas = Object.fromEntries([...b.components.entries()].reverse());
  let doc: unknown;
  if (options.output === "schema") {
    doc = isObj(data) ? { components: { schemas } } : { components: { schemas: { ...schemas, [pascal(name)]: root } } };
  } else {
    const json = { content: { "application/json": { schema: root } } };
    const op: S = { summary: `${options.method === "get" ? "Get" : options.method === "post" ? "Create" : "Update"} ${pascal(name)}`, operationId: `${options.method}${pascal(name)}` };
    if (options.method !== "get") op.requestBody = { required: true, ...json };
    op.responses = {
      [options.method === "post" ? "201" : "200"]: { description: options.method === "post" ? "Created" : "OK", ...json },
      "400": { description: "Bad request" },
    };
    doc = {
      openapi: options.version === "3.1" ? "3.1.0" : "3.0.3",
      info: { title: `${pascal(name)} API`, version: "1.0.0" },
      paths: { [path]: { [options.method]: op } },
      components: { schemas },
    };
  }
  const out = options.format === "json" ? JSON.stringify(doc, null, 2) : dump(doc, { lineWidth: -1, noRefs: true });
  return { output: out, error: null };
}

import type { TransformResult } from "@/lib/tool-transform";
import type { AvroSchemaGeneratorOptions } from "./schema";

type Opts = AvroSchemaGeneratorOptions;
type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

type Kind = "null" | "boolean" | "int" | "long" | "double" | "string" | "record" | "array";
const ORDER: Kind[] = ["null", "boolean", "int", "long", "double", "string", "record", "array"];

interface Node {
  kinds: Set<Kind>;
  /** record fields, with how many record samples had them */
  fields: Map<string, { node: Node; seen: number }>;
  records: number;
  items?: Node;
  /** string logical type candidates still alive after all samples */
  logical: { date: boolean; ts: boolean; uuid: boolean; strings: number };
  /** where this node first appeared (for docs) */
  path: string;
}

const mk = (path: string): Node => ({ kinds: new Set(), fields: new Map(), records: 0, logical: { date: true, ts: true, uuid: true, strings: 0 }, path });

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TS = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:?\d{2})$/;
const UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function observe(node: Node, v: Json, o: Opts, path: string) {
  if (v === null) node.kinds.add("null");
  else if (typeof v === "boolean") node.kinds.add("boolean");
  else if (typeof v === "number") {
    if (Number.isInteger(v)) node.kinds.add(o.integers === "long" || v > 2147483647 || v < -2147483648 ? "long" : "int");
    else node.kinds.add("double");
  } else if (typeof v === "string") {
    node.kinds.add("string");
    node.logical.strings++;
    if (!DATE.test(v)) node.logical.date = false;
    if (!TS.test(v)) node.logical.ts = false;
    if (!UUID.test(v)) node.logical.uuid = false;
  } else if (Array.isArray(v)) {
    node.kinds.add("array");
    node.items ??= mk(path + "[]");
    for (const e of v) observe(node.items, e, o, path + "[]");
    if (v.length === 0 && node.items.kinds.size === 0) node.items.kinds.add("null");
  } else {
    node.kinds.add("record");
    node.records++;
    for (const [k, x] of Object.entries(v)) {
      let f = node.fields.get(k);
      if (!f) {
        f = { node: mk(`${path}.${k}`), seen: 0 };
        node.fields.set(k, f);
      }
      f.seen++;
      observe(f.node, x, o, `${path}.${k}`);
    }
  }
}

const pascal = (s: string) =>
  s
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join("") || "Record";

const singular = (s: string) => (/ies$/i.test(s) ? s.replace(/ies$/i, "y") : /(ss|us|is)$/i.test(s) ? s : /s$/i.test(s) ? s.slice(0, -1) : s);

export function avroName(raw: string): string {
  let n = raw.replace(/[^A-Za-z0-9_]/g, "_");
  if (n === "" || /^[0-9]/.test(n)) n = "_" + n;
  return n;
}

type Avro = string | { [k: string]: unknown } | Avro[];

interface Ctx {
  o: Opts;
  used: Set<string>;
  warnings: string[];
}

function nodeToAvro(node: Node, ctx: Ctx, name: string, nullable: boolean): Avro {
  const kinds = [...node.kinds].filter((k) => k !== "null");
  // numeric widening
  const hasInt = kinds.includes("int");
  const hasLong = kinds.includes("long");
  const hasDouble = kinds.includes("double");
  const picked: Kind[] = kinds.filter((k) => k !== "int" && k !== "long" && k !== "double");
  if (hasDouble) picked.push("double");
  else if (hasLong) picked.push("long");
  else if (hasInt) picked.push("int");
  picked.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  const types: Avro[] = picked.map((k) => kindToAvro(k, node, ctx, name));
  const hasNull = node.kinds.has("null") || nullable;
  if (types.length === 0) return "null";
  if (hasNull) return ["null", ...types];
  return types.length === 1 ? types[0]! : types;
}

function kindToAvro(k: Kind, node: Node, ctx: Ctx, name: string): Avro {
  const o = ctx.o;
  switch (k) {
    case "boolean":
      return "boolean";
    case "int":
      return "int";
    case "long":
      return "long";
    case "double":
      return o.floats === "float" ? "float" : "double";
    case "string": {
      const l = node.logical;
      if (o.logicalTypes && l.strings > 0 && node.kinds.size >= 1) {
        if (l.date) return { type: "int", logicalType: "date" };
        if (l.ts) return { type: "long", logicalType: "timestamp-millis" };
        if (l.uuid) return { type: "string", logicalType: "uuid" };
      }
      return "string";
    }
    case "array": {
      const items = node.items!;
      if (items.kinds.size === 1 && items.kinds.has("null") && items.records === 0) ctx.warnings.push(`${node.path}: empty array, item type unknown, assumed string`);
      const itemAvro = items.kinds.size === 1 && items.kinds.has("null") ? "string" : nodeToAvro(items, ctx, singular(name), false);
      return { type: "array", items: itemAvro };
    }
    case "record": {
      // map heuristic
      if (o.mapMinKeys > 0 && node.fields.size >= o.mapMinKeys) {
        const vals = [...node.fields.values()];
        const sig = (n: Node) => [...n.kinds].filter((x) => x !== "null").sort().join("|");
        if (vals.every((f) => sig(f.node) === sig(vals[0]!.node)) && vals.every((f) => f.node.kinds.size > 0 && !f.node.kinds.has("record"))) {
          const merged = mk(node.path + "{}");
          for (const f of vals) {
            for (const kk of f.node.kinds) merged.kinds.add(kk);
            merged.logical.date &&= f.node.logical.date;
            merged.logical.ts &&= f.node.logical.ts;
            merged.logical.uuid &&= f.node.logical.uuid;
            merged.logical.strings += f.node.logical.strings;
          }
          return { type: "map", values: nodeToAvro(merged, ctx, name, false) };
        }
      }
      let rn = avroName(pascal(name));
      let i = 2;
      const base = rn;
      while (ctx.used.has(rn)) rn = base + i++;
      ctx.used.add(rn);
      const fields = [...node.fields.entries()].map(([key, f]) => {
        const legal = avroName(key);
        const missing = f.seen < node.records;
        const nullable = o.nullable === "all" || (o.nullable === "missing" && missing);
        const t = nodeToAvro(f.node, ctx, key, nullable);
        const isNullable = Array.isArray(t) && t[0] === "null";
        const field: { [k: string]: unknown } = { name: legal, type: t };
        if (legal !== key) {
          ctx.warnings.push(`"${key}" is not a legal Avro name; renamed to ${legal}`);
          if (o.aliases) field.aliases = [key].filter((a) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(a));
          if (Array.isArray(field.aliases) && field.aliases.length === 0) delete field.aliases;
        }
        if (isNullable && o.nullDefaults) field.default = null;
        return field;
      });
      const rec: { [k: string]: unknown } = { type: "record", name: rn };
      if (ctx.o.docs) rec.doc = `Inferred from ${node.path || "$"}`;
      rec.fields = fields;
      return rec;
    }
    default:
      return "null";
  }
}

export function inferAvro(samples: Json[], o: Opts): { schema: Avro; warnings: string[] } {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(o.recordName)) throw new Error("Record name must start with a letter or _ and use only letters, digits and _");
  if (o.namespace && !/^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/.test(o.namespace)) throw new Error("Namespace must be dotted names like com.example.events");
  const root = mk("$");
  for (const s of samples) observe(root, s, o, "$");
  if (root.kinds.size !== 1 || !root.kinds.has("record")) throw new Error("The sample must be a JSON object (or an array of objects)");
  const ctx: Ctx = { o, used: new Set(), warnings: [] };
  const schema = nodeToAvro(root, ctx, o.recordName, false) as { [k: string]: unknown };
  const out: { [k: string]: unknown } = { type: "record", name: schema.name };
  if (o.namespace) out.namespace = o.namespace;
  if (schema.doc) out.doc = schema.doc;
  out.fields = schema.fields;
  return { schema: out, warnings: ctx.warnings };
}

export function avroSchemaGenerator(input: string, options: Partial<Opts> = {}): TransformResult {
  const o: Opts = {
    recordName: options.recordName ?? "Root",
    namespace: options.namespace ?? "com.example",
    nullable: options.nullable ?? "missing",
    nullDefaults: options.nullDefaults ?? true,
    logicalTypes: options.logicalTypes ?? false,
    integers: options.integers ?? "auto",
    floats: options.floats ?? "double",
    mapMinKeys: options.mapMinKeys ?? 0,
    aliases: options.aliases ?? true,
    format: options.format ?? "avsc",
    docs: options.docs ?? false,
  };
  if (input.trim() === "") return { output: "", error: null };
  let data: Json;
  try {
    data = JSON.parse(input) as Json;
  } catch (e) {
    // newline-delimited JSON
    try {
      const lines = input.split(/\r?\n/).filter((l) => l.trim());
      data = lines.map((l) => JSON.parse(l) as Json);
    } catch {
      return { output: "", error: { message: `Invalid JSON: ${(e as Error).message}` } };
    }
  }
  try {
    const samples = Array.isArray(data) ? data : [data];
    if (samples.length === 0) return { output: "", error: { message: "The array is empty: there is nothing to infer from" } };
    const { schema, warnings } = inferAvro(samples, o);
    const compact = JSON.stringify(schema);
    let out: string;
    if (o.format === "registry") out = JSON.stringify({ schema: compact }, null, 2);
    else if (o.format === "compact") out = compact;
    else out = JSON.stringify(schema, null, 2);
    if (warnings.length && o.format === "avsc") out += "\n\n// " + warnings.join("\n// ");
    return { output: out, error: null };
  } catch (e) {
    return { output: "", error: { message: (e as Error).message } };
  }
}

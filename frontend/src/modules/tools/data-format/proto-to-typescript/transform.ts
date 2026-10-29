import type { TransformResult } from "@/lib/tool-transform";
import type { ProtoToTypescriptOptions } from "./schema";

export interface PField { name: string; jsonName: string; type: string; label: "repeated" | "optional" | "required" | ""; number: number; mapKey?: string; oneof?: string }
export interface PMessage { kind: "message"; name: string; full: string; fields: PField[] }
export interface PEnum { kind: "enum"; name: string; full: string; values: [string, number][] }
export type PType = PMessage | PEnum;
export interface ProtoFile { pkg: string; syntax: string; types: PType[]; services: { name: string; rpcs: string[] }[] }

export function tokenize(src: string): string[] {
  const clean = src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
  return clean.match(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[A-Za-z_][\w.]*|-?\d+(?:\.\d+)?|[{}()<>[\];=,.]/g) ?? [];
}

export const lowerCamel = (s: string) => s.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

export function parseProto(src: string): ProtoFile {
  const t = tokenize(src);
  let i = 0;
  const peek = () => t[i];
  const next = () => { if (i >= t.length) throw new Error("Unexpected end of file"); return t[i++]!; };
  const expect = (v: string) => { const x = next(); if (x !== v) throw new Error(`Expected "${v}" but found "${x}"`); };
  const skipStatement = () => { let d = 0; while (i < t.length) { const x = next(); if (x === "{") d++; if (x === "}") { d--; if (d <= 0) return; } if (x === ";" && d === 0) return; } };
  const skipOptions = () => { if (peek() === "[") { let d = 0; do { const x = next(); if (x === "[") d++; if (x === "]") d--; } while (d > 0); } };
  const file: ProtoFile = { pkg: "", syntax: "proto2", types: [], services: [] };

  const parseEnum = (prefix: string) => {
    const name = next();
    const e: PEnum = { kind: "enum", name, full: prefix ? `${prefix}.${name}` : name, values: [] };
    expect("{");
    while (peek() !== "}") {
      const x = next();
      if (x === "option" || x === "reserved") { skipStatement(); continue; }
      if (x === ";") continue;
      expect("=");
      const n = Number(next());
      skipOptions();
      expect(";");
      e.values.push([x, n]);
    }
    expect("}");
    file.types.push(e);
  };

  const parseMessage = (prefix: string) => {
    const name = next();
    const full = prefix ? `${prefix}.${name}` : name;
    const m: PMessage = { kind: "message", name, full, fields: [] };
    file.types.push(m);
    expect("{");
    const fieldsUntil = (end: string, oneof?: string) => {
      while (peek() !== end) {
        const x = peek()!;
        if (x === ";") { next(); continue; }
        if (x === "message") { next(); parseMessage(full); continue; }
        if (x === "enum") { next(); parseEnum(full); continue; }
        if (x === "option" || x === "reserved" || x === "extensions" || x === "extend") { next(); skipStatement(); continue; }
        if (x === "oneof") { next(); const oname = next(); expect("{"); fieldsUntil("}", oname); expect("}"); continue; }
        let label: PField["label"] = "";
        if (x === "repeated" || x === "optional" || x === "required") { label = x; next(); }
        let type = next();
        let mapKey: string | undefined;
        if (type === "map") { expect("<"); mapKey = next(); expect(","); type = next(); expect(">"); }
        if (type === "group") throw new Error("proto2 groups are not supported");
        const fname = next();
        expect("=");
        const num = Number(next());
        let jsonName = lowerCamel(fname);
        if (peek() === "[") {
          const start = i;
          skipOptions();
          const opts = t.slice(start, i).join(" ");
          const jn = /json_name\s*=\s*"([^"]*)"/.exec(opts);
          if (jn) jsonName = jn[1]!;
        }
        expect(";");
        m.fields.push({ name: fname, jsonName, type, label, number: num, mapKey, oneof });
      }
    };
    fieldsUntil("}");
    expect("}");
  };

  while (i < t.length) {
    const x = next();
    if (x === "syntax" || x === "edition") { expect("="); file.syntax = next().replace(/["']/g, ""); expect(";"); }
    else if (x === "package") { file.pkg = next(); expect(";"); }
    else if (x === "import" || x === "option") skipStatement();
    else if (x === "message") parseMessage("");
    else if (x === "enum") parseEnum("");
    else if (x === "service") {
      const name = next();
      const svc = { name, rpcs: [] as string[] };
      expect("{");
      while (peek() !== "}") {
        const y = next();
        if (y === "rpc") {
          const rpc = next();
          expect("(");
          let req = next(); if (req === "stream") req = `stream ${next()}`;
          expect(")"); expect("returns"); expect("(");
          let res = next(); if (res === "stream") res = `stream ${next()}`;
          expect(")");
          if (peek() === "{") skipStatement(); else expect(";");
          svc.rpcs.push(`${rpc}(${req}) returns (${res})`);
        } else if (y !== ";") skipStatement();
      }
      expect("}");
      file.services.push(svc);
    } else if (x === ";") continue;
    else throw new Error(`Unexpected "${x}" at top level`);
  }
  return file;
}

const WKT: Record<string, string> = {
  "google.protobuf.Timestamp": "string", "google.protobuf.Duration": "string", "google.protobuf.FieldMask": "string",
  "google.protobuf.Struct": "Record<string, unknown>", "google.protobuf.Value": "unknown", "google.protobuf.ListValue": "unknown[]",
  "google.protobuf.Any": "{ \"@type\": string; [key: string]: unknown }", "google.protobuf.Empty": "Record<string, never>", "google.protobuf.NullValue": "null",
  "google.protobuf.StringValue": "string | null", "google.protobuf.BytesValue": "string | null", "google.protobuf.BoolValue": "boolean | null",
  "google.protobuf.Int32Value": "number | null", "google.protobuf.UInt32Value": "number | null", "google.protobuf.FloatValue": "number | null", "google.protobuf.DoubleValue": "number | null",
  "google.protobuf.Int64Value": "string | null", "google.protobuf.UInt64Value": "string | null",
};
const WKT_SAMPLE: Record<string, unknown> = {
  "google.protobuf.Timestamp": "2024-01-31T10:15:30Z", "google.protobuf.Duration": "1.5s", "google.protobuf.FieldMask": "user.displayName,photo",
  "google.protobuf.Struct": { key: "value" }, "google.protobuf.Value": "any", "google.protobuf.ListValue": [], "google.protobuf.Any": { "@type": "type.googleapis.com/google.protobuf.Empty" },
  "google.protobuf.Empty": {}, "google.protobuf.StringValue": "string", "google.protobuf.BoolValue": true, "google.protobuf.Int32Value": 0, "google.protobuf.Int64Value": "0",
  "google.protobuf.DoubleValue": 0, "google.protobuf.FloatValue": 0, "google.protobuf.UInt32Value": 0, "google.protobuf.UInt64Value": "0", "google.protobuf.BytesValue": "",
};
const INT64 = new Set(["int64", "uint64", "sint64", "fixed64", "sfixed64"]);
const NUM = new Set(["double", "float", "int32", "uint32", "sint32", "fixed32", "sfixed32"]);

const tsName = (full: string) => full.replace(/\./g, "_");

/** Resolve a type reference the way protoc does: innermost scope first. */
function resolve(ref: string, scope: string, file: ProtoFile): PType | undefined {
  const r = ref.replace(/^\./, "").replace(file.pkg ? new RegExp(`^${file.pkg.replace(/\./g, "\\.")}\\.`) : /^$/, "");
  const parts = scope.split(".").filter(Boolean);
  for (let k = parts.length; k >= 0; k--) {
    const cand = [...parts.slice(0, k), r].join(".");
    const hit = file.types.find((x) => x.full === cand);
    if (hit) return hit;
  }
  return undefined;
}

export function runProtoToTypescript(input: string, options: ProtoToTypescriptOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  let file: ProtoFile;
  try { file = parseProto(input); } catch (e) { return { output: "", error: { message: (e as Error).message } }; }
  const messages = file.types.filter((x): x is PMessage => x.kind === "message");
  if (file.types.length === 0) return { output: "", error: { message: "No message or enum found." } };
  const unknown = new Set<string>();

  const scalarTs = (type: string, scope: string): string => {
    if (type === "string" || type === "bytes") return "string";
    if (type === "bool") return "boolean";
    if (NUM.has(type)) return "number";
    if (INT64.has(type)) return options.int64 === "string" ? "string" : "number";
    const wk = WKT[type.replace(/^\./, "")];
    if (wk) return wk;
    const ref = resolve(type, scope, file);
    if (ref) return tsName(ref.full);
    unknown.add(type);
    return "unknown";
  };

  if (options.output === "typescript") {
    const out: string[] = [];
    out.push(`// Generated from ${file.syntax} following the protobuf JSON mapping: field names in lowerCamelCase, ${options.int64 === "string" ? "64-bit integers as strings, " : ""}bytes as base64.`);
    for (const ty of file.types) {
      if (ty.kind === "enum") {
        out.push(options.enumStyle === "union"
          ? `export type ${tsName(ty.full)} = ${ty.values.map(([n]) => JSON.stringify(n)).join(" | ")};`
          : `export enum ${tsName(ty.full)} {\n${ty.values.map(([n]) => `  ${n} = ${JSON.stringify(n)},`).join("\n")}\n}`);
        continue;
      }
      const props = ty.fields.map((f) => {
        let t = scalarTs(f.type, ty.full);
        if (f.mapKey) t = `Record<string, ${t}>`;
        else if (f.label === "repeated") t = /[ |{]/.test(t) ? `Array<${t}>` : `${t}[]`;
        const req = f.label === "required";
        const key = /^[A-Za-z_$][\w$]*$/.test(f.jsonName) ? f.jsonName : JSON.stringify(f.jsonName);
        return `  ${key}${req ? "" : "?"}: ${t};${f.oneof ? ` // oneof ${f.oneof}` : ""}`;
      });
      out.push(`export interface ${tsName(ty.full)} {\n${props.join("\n")}\n}`);
    }
    for (const s of file.services) out.push(`// service ${s.name}\n${s.rpcs.map((r) => `//   rpc ${r}`).join("\n")}`);
    if (unknown.size) out.push(`// Unresolved (imported?) types mapped to unknown: ${[...unknown].join(", ")}`);
    return { output: out.join("\n\n"), error: null };
  }

  const sampleOf = (type: string, scope: string, seen: Set<string>): unknown => {
    if (type === "string") return "string";
    if (type === "bytes") return "AQID";
    if (type === "bool") return true;
    if (NUM.has(type)) return type === "double" || type === "float" ? 1.5 : 1;
    if (INT64.has(type)) return options.int64 === "string" ? "1" : 1;
    const wk = WKT_SAMPLE[type.replace(/^\./, "")];
    if (wk !== undefined) return wk;
    const ref = resolve(type, scope, file);
    if (!ref) return null;
    if (ref.kind === "enum") return ref.values.find(([, n]) => n !== 0)?.[0] ?? ref.values[0]?.[0] ?? null;
    if (seen.has(ref.full)) return null;
    return objectOf(ref, new Set([...seen, ref.full]));
  };
  const objectOf = (m: PMessage, seen: Set<string>): Record<string, unknown> => {
    const o: Record<string, unknown> = {};
    const oneofsUsed = new Set<string>();
    for (const f of m.fields) {
      if (f.oneof) { if (oneofsUsed.has(f.oneof)) continue; oneofsUsed.add(f.oneof); }
      const v = sampleOf(f.type, m.full, seen);
      o[f.jsonName] = f.mapKey ? { [f.mapKey === "string" ? "key" : "1"]: v } : f.label === "repeated" ? [v] : v;
    }
    return o;
  };
  const root = messages.find((m) => !m.full.includes(".")) ?? messages[0];
  if (!root) return { output: "", error: { message: "No message to build a sample from." } };
  const samples = messages.filter((m) => !m.full.includes(".")).map((m) => `// ${m.full}\n${JSON.stringify(objectOf(m, new Set([m.full])), null, 2)}`);
  return { output: samples.join("\n\n"), error: null };
}

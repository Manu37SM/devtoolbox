import { dump, load } from "js-yaml";
import type { TransformResult } from "@/lib/tool-transform";
import type { KubernetesSecretEncoderOptions } from "./schema";

export function b64encode(s: string): string {
  let bin = "";
  for (const b of new TextEncoder().encode(s)) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function b64decode(s: string): string {
  const bin = atob(s.replace(/\s+/g, ""));
  return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const yaml = (v: unknown) => dump(v, { lineWidth: -1, noRefs: true });

export function parseEnv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = /^(?:export\s+)?([A-Za-z_][\w.-]*)\s*=\s*(.*)$/.exec(line);
    if (!m) throw new Error(`Not a KEY=VALUE line: ${line}`);
    let v = m[2]!;
    if ((v.startsWith('"') && v.endsWith('"') && v.length > 1) || (v.startsWith("'") && v.endsWith("'") && v.length > 1)) v = v.slice(1, -1);
    out[m[1]!] = v;
  }
  return out;
}

export function transformSecret(input: string, options: KubernetesSecretEncoderOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  try {
    if (options.mode === "from-env") {
      const data: Record<string, string> = {};
      for (const [k, v] of Object.entries(parseEnv(input))) data[k] = b64encode(v);
      return { output: yaml({ apiVersion: "v1", kind: "Secret", metadata: { name: "my-secret" }, type: "Opaque", data }), error: null };
    }
    const doc = load(input);
    if (!isObj(doc)) return { output: "", error: { message: "Expected a YAML Secret manifest" } };
    if (doc.kind !== undefined && doc.kind !== "Secret") return { output: "", error: { message: `kind is "${String(doc.kind)}", expected Secret` } };
    const data = isObj(doc.data) ? doc.data : {};
    const stringData = isObj(doc.stringData) ? doc.stringData : {};
    if (options.mode === "encode") {
      const merged: Record<string, string> = {};
      for (const [k, v] of Object.entries(data)) merged[k] = String(v);
      for (const [k, v] of Object.entries(stringData)) merged[k] = b64encode(typeof v === "string" ? v : JSON.stringify(v));
      const { stringData: _s, data: _d, ...rest } = doc;
      void _s; void _d;
      return { output: yaml({ ...rest, data: merged }), error: null };
    }
    const decoded: Record<string, string> = {};
    for (const [k, v] of Object.entries(data)) {
      try { decoded[k] = b64decode(String(v)); } catch { return { output: "", error: { message: `Value of "${k}" is not valid base64 text (binary or corrupt)` } }; }
    }
    for (const [k, v] of Object.entries(stringData)) decoded[k] = String(v);
    const { data: _d, stringData: _s, ...rest } = doc;
    void _d; void _s;
    return { output: yaml({ ...rest, stringData: decoded }), error: null };
  } catch (e) {
    const err = e as { message: string; mark?: { line: number; column: number } };
    return { output: "", error: { message: err.message.split("\n")[0]!, line: err.mark ? err.mark.line + 1 : undefined, column: err.mark ? err.mark.column + 1 : undefined } };
  }
}

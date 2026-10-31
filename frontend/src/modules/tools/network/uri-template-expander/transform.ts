import type { TransformResult } from "@/lib/tool-transform";
import type { UriTemplateExpanderOptions } from "./schema";

interface OpDef {
  first: string;
  sep: string;
  named: boolean;
  ifemp: string;
  reserved: boolean;
  label: string;
}

const OPS: Record<string, OpDef> = {
  "": { first: "", sep: ",", named: false, ifemp: "", reserved: false, label: "simple string" },
  "+": { first: "", sep: ",", named: false, ifemp: "", reserved: true, label: "reserved expansion" },
  "#": { first: "#", sep: ",", named: false, ifemp: "", reserved: true, label: "fragment" },
  ".": { first: ".", sep: ".", named: false, ifemp: "", reserved: false, label: "label (dot) prefix" },
  "/": { first: "/", sep: "/", named: false, ifemp: "", reserved: false, label: "path segment" },
  ";": { first: ";", sep: ";", named: true, ifemp: "", reserved: false, label: "path-style parameter" },
  "?": { first: "?", sep: "&", named: true, ifemp: "=", reserved: false, label: "form-style query" },
  "&": { first: "&", sep: "&", named: true, ifemp: "=", reserved: false, label: "query continuation" },
};

export interface VarSpec {
  name: string;
  /** prefix length from `:N`, or null */
  max: number | null;
  explode: boolean;
}

export interface Expression {
  op: string;
  vars: VarSpec[];
  raw: string;
}

export type Part = string | Expression;

const VARNAME = /^(?:[A-Za-z0-9_]|%[0-9A-Fa-f]{2})(?:\.?(?:[A-Za-z0-9_]|%[0-9A-Fa-f]{2}))*$/;

/** Splits a template into literals and expressions; throws with a readable message on malformed input. */
export function parseTemplate(template: string): Part[] {
  const parts: Part[] = [];
  let lit = "";
  let i = 0;
  while (i < template.length) {
    const ch = template[i]!;
    if (ch === "}") throw new Error(`Unmatched "}" at position ${i + 1}`);
    if (ch !== "{") {
      lit += ch;
      i++;
      continue;
    }
    const end = template.indexOf("}", i + 1);
    if (end < 0) throw new Error(`Unclosed "{" at position ${i + 1}`);
    const nested = template.indexOf("{", i + 1);
    if (nested >= 0 && nested < end) throw new Error(`Nested "{" at position ${nested + 1}`);
    const body = template.slice(i + 1, end);
    if (lit) parts.push(lit);
    lit = "";
    parts.push(parseExpression(body, i + 1));
    i = end + 1;
  }
  if (lit) parts.push(lit);
  return parts;
}

function parseExpression(body: string, pos: number): Expression {
  if (body === "") throw new Error(`Empty expression at position ${pos}`);
  let op = "";
  let rest = body;
  if ("+#./;?&".includes(body[0]!)) {
    op = body[0]!;
    rest = body.slice(1);
  } else if ("=,!@|".includes(body[0]!)) {
    throw new Error(`Operator "${body[0]}" in {${body}} is reserved by RFC 6570 for future use`);
  }
  if (rest === "") throw new Error(`No variable name in {${body}}`);
  const vars: VarSpec[] = [];
  for (const spec of rest.split(",")) {
    let name = spec;
    let max: number | null = null;
    let explode = false;
    if (name.endsWith("*")) {
      explode = true;
      name = name.slice(0, -1);
    } else {
      const m = /^(.*):(\d+)$/.exec(name);
      if (m) {
        name = m[1]!;
        max = Number(m[2]);
        if (max < 1 || max > 9999 || m[2]!.length > 4) throw new Error(`Prefix length in {${body}} must be 1-9999`);
      }
    }
    if (!VARNAME.test(name)) throw new Error(`Invalid variable name "${name}" in {${body}}`);
    vars.push({ name, max, explode });
  }
  return { op, vars, raw: `{${body}}` };
}

const RESERVED_KEEP = /[:/?#[\]@!$&'()*+,;=]/;

function pctEncode(s: string, keepReserved: boolean): string {
  let out = "";
  const chars = Array.from(s);
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i]!;
    if (/[A-Za-z0-9\-._~]/.test(c)) {
      out += c;
    } else if (keepReserved && RESERVED_KEEP.test(c)) {
      out += c;
    } else if (keepReserved && c === "%" && /^[0-9A-Fa-f]{2}$/.test((chars[i + 1] ?? "") + (chars[i + 2] ?? ""))) {
      out += c; // existing pct-encoded triplet survives {+var} and {#var}
    } else {
      out += encodeURIComponent(c).replace(/[!'()*]/g, (x) => "%" + x.charCodeAt(0).toString(16).toUpperCase());
    }
  }
  return out;
}

function normalise(v: unknown): { kind: "undef" } | { kind: "str"; s: string } | { kind: "list"; l: string[] } | { kind: "map"; m: Array<[string, string]> } {
  if (v === undefined || v === null) return { kind: "undef" };
  if (typeof v === "string") return { kind: "str", s: v };
  if (typeof v === "number" || typeof v === "boolean" || typeof v === "bigint") return { kind: "str", s: String(v) };
  if (Array.isArray(v)) {
    const l = v.filter((x) => x !== null && x !== undefined).map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x)));
    return l.length ? { kind: "list", l } : { kind: "undef" };
  }
  if (typeof v === "object") {
    const m = Object.entries(v as Record<string, unknown>)
      .filter(([, x]) => x !== null && x !== undefined)
      .map(([k, x]): [string, string] => [k, typeof x === "object" ? JSON.stringify(x) : String(x)]);
    return m.length ? { kind: "map", m } : { kind: "undef" };
  }
  return { kind: "undef" };
}

export interface ExpansionNote {
  expr: string;
  note: string;
}

export function expandExpression(e: Expression, vars: Record<string, unknown>, notes?: ExpansionNote[]): string {
  const def = OPS[e.op]!;
  const out: string[] = [];
  const enc = (s: string) => pctEncode(s, def.reserved);
  for (const spec of e.vars) {
    const val = normalise(vars[spec.name]);
    if (val.kind === "undef") {
      notes?.push({ expr: e.raw, note: `${spec.name}: undefined or empty collection, skipped` });
      continue;
    }
    if (val.kind === "str") {
      let s = val.s;
      if (spec.max !== null) s = Array.from(s).slice(0, spec.max).join("");
      const encoded = enc(s);
      if (def.named) {
        out.push(encodeName(spec.name) + (s === "" ? def.ifemp : "=" + encoded));
      } else {
        out.push(encoded);
      }
      notes?.push({ expr: e.raw, note: `${spec.name}: string${spec.max !== null ? `, first ${spec.max} chars` : ""}` });
      continue;
    }
    // composite values: the prefix modifier is not allowed on them (RFC 6570 section 2.4.1)
    if (spec.max !== null) {
      throw new Error(`${spec.name} is a ${val.kind === "list" ? "list" : "map"}; the :${spec.max} prefix modifier only applies to strings (in ${e.raw})`);
    }
    if (val.kind === "list") {
      if (spec.explode) {
        const items = val.l.map((x) => (def.named ? encodeName(spec.name) + (x === "" ? def.ifemp : "=" + enc(x)) : enc(x)));
        out.push(items.join(def.sep));
      } else {
        const joined = val.l.map(enc).join(",");
        out.push(def.named ? encodeName(spec.name) + (joined === "" ? def.ifemp : "=" + joined) : joined);
      }
      notes?.push({ expr: e.raw, note: `${spec.name}: list of ${val.l.length}${spec.explode ? ", exploded" : ""}` });
    } else {
      if (spec.explode) {
        const items = val.m.map(([k, x]) => (def.named ? encodeName(k) + (x === "" ? def.ifemp : "=" + enc(x)) : enc(k) + "=" + enc(x)));
        out.push(items.join(def.sep));
      } else {
        const joined = val.m.map(([k, x]) => enc(k) + "," + enc(x)).join(",");
        out.push(def.named ? encodeName(spec.name) + (joined === "" ? def.ifemp : "=" + joined) : joined);
      }
      notes?.push({ expr: e.raw, note: `${spec.name}: map of ${val.m.length}${spec.explode ? ", exploded" : ""}` });
    }
  }
  if (out.length === 0) return "";
  return def.first + out.join(def.sep);
}

function encodeName(n: string): string {
  return pctEncode(n, false);
}

export function expandTemplate(template: string, vars: Record<string, unknown>, notes?: ExpansionNote[]): string {
  return parseTemplate(template)
    .map((p) => (typeof p === "string" ? pctEncode(p, true) : expandExpression(p, vars, notes)))
    .join("");
}

export function templateVariables(template: string): Array<{ name: string; op: string; max: number | null; explode: boolean }> {
  const seen: Array<{ name: string; op: string; max: number | null; explode: boolean }> = [];
  for (const p of parseTemplate(template)) {
    if (typeof p === "string") continue;
    for (const v of p.vars) seen.push({ name: v.name, op: p.op, max: v.max, explode: v.explode });
  }
  return seen;
}

function parseVariables(text: string): Record<string, unknown> {
  const t = text.trim();
  if (t === "") return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(t);
  } catch (e) {
    throw new Error(`Variables must be a JSON object: ${(e as Error).message}`);
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Variables must be a JSON object, e.g. {\"id\": 42}");
  return parsed as Record<string, unknown>;
}

export function uriTemplateExpander(input: string, options: Partial<UriTemplateExpanderOptions> = {}): TransformResult {
  const action = options.action ?? "expand";
  const explain = options.explain ?? false;
  const showTemplate = options.showTemplate ?? false;
  const lines = input.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return { output: "", error: null };
  try {
    const vars = action === "expand" ? parseVariables(options.variables ?? "") : {};
    const out: string[] = [];
    lines.forEach((raw, idx) => {
      const tpl = raw.trim();
      try {
        if (action === "check") {
          parseTemplate(tpl);
          out.push(`OK   ${tpl}`);
        } else if (action === "variables") {
          const vs = templateVariables(tpl);
          out.push(`${tpl}`);
          if (vs.length === 0) out.push("  (no variables)");
          for (const v of vs) {
            const mods = [v.max !== null ? `prefix :${v.max}` : "", v.explode ? "explode *" : ""].filter(Boolean).join(", ");
            out.push(`  ${v.name.padEnd(16)} ${OPS[v.op]!.label}${v.op ? ` (${v.op})` : ""}${mods ? `, ${mods}` : ""}`);
          }
        } else {
          const notes: ExpansionNote[] = [];
          const r = expandTemplate(tpl, vars, explain ? notes : undefined);
          out.push(showTemplate ? `${tpl}  →  ${r}` : r);
          if (explain) for (const n of notes) out.push(`    ${n.expr} ${n.note}`);
        }
      } catch (e) {
        if (lines.length === 1) throw e;
        out.push(`ERROR line ${idx + 1}: ${(e as Error).message}`);
      }
    });
    return { output: out.join("\n"), error: null };
  } catch (e) {
    return { output: "", error: { message: (e as Error).message } };
  }
}

import type { TransformResult } from "@/lib/tool-transform";
import type { JsonSchemaSampleGeneratorOptions } from "./schema";

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ["Alex", "Priya", "Sam", "Maria", "Chen", "Omar", "Elena", "Ravi"];
const LAST = ["Morgan", "Sharma", "Lee", "Garcia", "Wang", "Haddad", "Rossi", "Iyer"];
const CITY = ["Mumbai", "Berlin", "Austin", "Lagos", "Osaka", "Lyon"];
const COUNTRY = ["India", "Germany", "United States", "Nigeria", "Japan", "France"];
const WORDS = ["alpha", "bravo", "delta", "echo", "lima", "sierra", "tango", "zulu"];

class Gen {
  private rnd: () => number;
  constructor(private root: Obj, private o: JsonSchemaSampleGeneratorOptions, seed: number) {
    this.rnd = mulberry32(seed);
  }
  private int(lo: number, hi: number) {
    return lo + Math.floor(this.rnd() * (hi - lo + 1));
  }
  private pick<T>(a: T[]): T {
    return a[this.int(0, a.length - 1)] as T;
  }
  private hex(n: number) {
    return Array.from({ length: n }, () => this.int(0, 15).toString(16)).join("");
  }
  private resolve(ref: string): Obj | null {
    if (!ref.startsWith("#")) return null;
    let cur: unknown = this.root;
    for (const part of ref.slice(1).split("/").filter(Boolean)) {
      cur = isObj(cur) ? cur[decodeURIComponent(part).replace(/~1/g, "/").replace(/~0/g, "~")] : undefined;
    }
    return isObj(cur) ? cur : null;
  }
  /** Merges allOf branches and a $ref into one schema. */
  private flatten(s: Obj, depth: number): Obj {
    let out: Obj = { ...s };
    if (typeof s.$ref === "string") {
      const target = this.resolve(s.$ref);
      if (target && depth < 30) {
        const { $ref: _ref, ...rest } = s;
        void _ref;
        out = { ...this.flatten(target, depth + 1), ...rest };
      }
    }
    if (Array.isArray(s.allOf)) {
      for (const part of s.allOf) {
        if (!isObj(part)) continue;
        const f = this.flatten(part, depth + 1);
        const props = { ...(isObj(out.properties) ? out.properties : {}), ...(isObj(f.properties) ? f.properties : {}) };
        const req = [...new Set([...(Array.isArray(out.required) ? out.required : []), ...(Array.isArray(f.required) ? f.required : [])])];
        out = { ...f, ...out, properties: props, required: req };
        delete out.allOf;
      }
    }
    return out;
  }

  value(schema: unknown, depth: number, name = "", required = true): unknown {
    if (schema === true || schema === undefined) return this.fromName(name) ?? "value";
    if (schema === false) return undefined;
    if (!isObj(schema)) return null;
    const s = this.flatten(schema, 0);
    if (depth > this.o.maxDepth && !required) return undefined;
    if (this.o.useExamples) {
      if ("const" in s) return s.const;
      if ("default" in s) return s.default;
      if (Array.isArray(s.examples) && s.examples.length) return s.examples[0];
      if ("example" in s) return s.example;
    } else if ("const" in s) return s.const;
    if (Array.isArray(s.enum) && s.enum.length) return this.o.useExamples ? s.enum[0] : this.pick(s.enum);
    for (const key of ["oneOf", "anyOf"] as const) {
      const alts = s[key];
      if (Array.isArray(alts) && alts.length) {
        const { [key]: _drop, ...base } = s;
        void _drop;
        const branch = alts[Math.min(this.o.variant, alts.length - 1)];
        return this.value({ ...base, ...(isObj(branch) ? this.flatten(branch, 0) : {}) }, depth, name, required);
      }
    }
    let type = s.type;
    if (Array.isArray(type)) type = type.find((t) => t !== "null") ?? "null";
    if (!type) {
      if (isObj(s.properties)) type = "object";
      else if (s.items !== undefined) type = "array";
      else if ("minimum" in s || "maximum" in s) type = "number";
      else if ("minLength" in s || "pattern" in s || "format" in s) type = "string";
    }
    switch (type) {
      case "object":
        return this.object(s, depth);
      case "array":
        return this.array(s, depth, name);
      case "string":
        return this.string(s, name);
      case "integer":
      case "number":
        return this.number(s, type === "integer", name);
      case "boolean":
        return this.o.useExamples ? true : this.rnd() < 0.5;
      case "null":
        return null;
      default:
        return this.fromName(name) ?? "value";
    }
  }

  private object(s: Obj, depth: number): Obj {
    const props = isObj(s.properties) ? s.properties : {};
    const req = new Set(Array.isArray(s.required) ? (s.required as string[]) : []);
    const out: Obj = {};
    for (const [k, sub] of Object.entries(props)) {
      if (this.o.fill === "required" && !req.has(k)) continue;
      const v = this.value(sub, depth + 1, k, req.has(k));
      if (v !== undefined) out[k] = v;
    }
    for (const k of req) if (!(k in out)) out[k] = "value";
    const min = typeof s.minProperties === "number" ? s.minProperties : 0;
    for (let i = 0; Object.keys(out).length < min; i++) out[`extra${i + 1}`] = isObj(s.additionalProperties) ? this.value(s.additionalProperties, depth + 1) : "value";
    return out;
  }

  private array(s: Obj, depth: number, name: string): unknown[] {
    const min = typeof s.minItems === "number" ? s.minItems : 0;
    const max = typeof s.maxItems === "number" ? s.maxItems : Infinity;
    const n = Math.max(min, Math.min(this.o.arrayLength, max));
    const out: unknown[] = [];
    if (Array.isArray(s.prefixItems)) s.prefixItems.forEach((p) => out.push(this.value(p, depth + 1)));
    else if (Array.isArray(s.items)) s.items.forEach((p) => out.push(this.value(p, depth + 1)));
    const itemSchema = Array.isArray(s.items) ? s.additionalItems : s.items;
    if (depth >= this.o.maxDepth && min === 0) return [];
    let guard = 0;
    while (out.length < n && guard++ < n * 20 + 20) {
      const v = this.value(itemSchema ?? {}, depth + 1, name.replace(/s$/, ""));
      if (s.uniqueItems && out.some((x) => JSON.stringify(x) === JSON.stringify(v))) {
        if (typeof v === "string") out.push(`${v}-${out.length}`);
        else if (typeof v === "number") out.push(v + out.length);
        continue;
      }
      out.push(v);
    }
    return out;
  }

  private fromName(name: string): string | number | boolean | undefined {
    const n = name.toLowerCase();
    if (!n) return undefined;
    if (/e-?mail/.test(n)) return `${this.pick(FIRST).toLowerCase()}.${this.pick(LAST).toLowerCase()}@example.com`;
    if (/first.?name|given/.test(n)) return this.pick(FIRST);
    if (/last.?name|surname|family/.test(n)) return this.pick(LAST);
    if (/^(full.?)?name$|username|display/.test(n)) return `${this.pick(FIRST)} ${this.pick(LAST)}`;
    if (/phone|mobile|tel/.test(n)) return `+91 98${this.int(10000000, 99999999)}`;
    if (/url|website|link|href/.test(n)) return `https://example.com/${this.pick(WORDS)}`;
    if (/city/.test(n)) return this.pick(CITY);
    if (/country/.test(n)) return this.pick(COUNTRY);
    if (/zip|postal|pin.?code/.test(n)) return String(this.int(10000, 99999));
    if (/street|address/.test(n)) return `${this.int(1, 220)} ${this.pick(LAST)} Street`;
    if (/title|subject/.test(n)) return `${this.pick(WORDS)} ${this.pick(WORDS)}`.replace(/^./, (c) => c.toUpperCase());
    if (/desc|comment|note|message|bio/.test(n)) return `A short ${this.pick(WORDS)} note about the ${this.pick(WORDS)}.`;
    return undefined;
  }

  private string(s: Obj, name: string): string {
    let out: string | undefined;
    const fmt = s.format;
    const date = () => `20${this.int(20, 26)}-${String(this.int(1, 12)).padStart(2, "0")}-${String(this.int(1, 28)).padStart(2, "0")}`;
    if (fmt === "email") out = `${this.pick(FIRST).toLowerCase()}@example.com`;
    else if (fmt === "uuid") out = `${this.hex(8)}-${this.hex(4)}-4${this.hex(3)}-a${this.hex(3)}-${this.hex(12)}`;
    else if (fmt === "date") out = date();
    else if (fmt === "date-time") out = `${date()}T${String(this.int(0, 23)).padStart(2, "0")}:${String(this.int(0, 59)).padStart(2, "0")}:00Z`;
    else if (fmt === "time") out = `${String(this.int(0, 23)).padStart(2, "0")}:${String(this.int(0, 59)).padStart(2, "0")}:00Z`;
    else if (fmt === "uri" || fmt === "url" || fmt === "iri") out = `https://example.com/${this.pick(WORDS)}`;
    else if (fmt === "hostname") out = `${this.pick(WORDS)}.example.com`;
    else if (fmt === "ipv4") out = `${this.int(1, 223)}.${this.int(0, 255)}.${this.int(0, 255)}.${this.int(1, 254)}`;
    else if (fmt === "ipv6") out = `2001:db8::${this.hex(4)}`;
    else if (fmt === "byte") out = "SGVsbG8=";
    else if (fmt === "duration") out = "PT15M";
    else if (typeof s.pattern === "string") out = this.fromPattern(s.pattern);
    else if (this.o.smartValues) out = String(this.fromName(name) ?? "");
    if (!out) out = name && !/^\d+$/.test(name) ? `${name}-${this.hex(4)}` : this.pick(WORDS);
    const min = typeof s.minLength === "number" ? s.minLength : 0;
    const max = typeof s.maxLength === "number" ? s.maxLength : Infinity;
    if (!s.pattern) {
      while (out.length < min) out += this.pick(WORDS);
      if (out.length > max) out = out.slice(0, max);
    }
    return out;
  }

  /** A string for simple patterns (anchors, classes, \d \w, {n,m}, alternation). Falls back to a word. */
  private fromPattern(pattern: string): string {
    const src = pattern.replace(/^\^/, "").replace(/\$$/, "");
    const alt = src.split("|");
    const body = alt.length > 1 && !/[()[\]]/.test(src) ? this.pick(alt) : src;
    let out = "";
    const re = /(\\d|\\w|\\s|\[[^\]]+\]|\\.|[^\\[\](){}*+?|])(\{(\d+)(?:,(\d*))?\}|[*+?])?/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(body))) {
      let reps = 1;
      if (m[2]) {
        if (m[2] === "*") reps = this.int(0, 2);
        else if (m[2] === "+") reps = this.int(1, 3);
        else if (m[2] === "?") reps = this.int(0, 1);
        else {
          const lo = Number(m[3]);
          const hi = m[4] === undefined ? lo : m[4] === "" ? lo + 2 : Number(m[4]);
          reps = this.int(lo, hi);
        }
      }
      for (let i = 0; i < reps; i++) out += this.atom(m[1] as string);
    }
    try {
      if (new RegExp(pattern).test(out)) return out;
    } catch {
      /* invalid pattern: fall through */
    }
    return "";
  }

  private atom(a: string): string {
    if (a === "\\d") return String(this.int(0, 9));
    if (a === "\\w") return this.pick("abcdefghijklmnopqrstuvwxyz".split(""));
    if (a === "\\s") return " ";
    if (a.startsWith("[")) {
      const neg = a[1] === "^";
      const set: string[] = [];
      const inner = a.slice(neg ? 2 : 1, -1);
      for (let i = 0; i < inner.length; i++) {
        if (inner[i + 1] === "-" && i + 2 < inner.length) {
          for (let c = inner.charCodeAt(i); c <= inner.charCodeAt(i + 2); c++) set.push(String.fromCharCode(c));
          i += 2;
        } else if (inner[i] === "\\" && inner[i + 1]) {
          const e = inner[++i];
          if (e === "d") for (let c = 48; c <= 57; c++) set.push(String.fromCharCode(c));
          else if (e === "w") set.push(..."abcdefghijklmnopqrstuvwxyz0123456789_".split(""));
          else set.push(e as string);
        } else set.push(inner[i] as string);
      }
      if (neg) {
        const pool = "abcdefghijklmnopqrstuvwxyz0123456789".split("").filter((c) => !set.includes(c));
        return this.pick(pool.length ? pool : ["x"]);
      }
      return this.pick(set.length ? set : ["x"]);
    }
    if (a.startsWith("\\")) return a[1] as string;
    if (a === ".") return this.pick("abcdefghij".split(""));
    return a;
  }

  private number(s: Obj, integer: boolean, name: string): number {
    let lo = typeof s.minimum === "number" ? s.minimum : typeof s.exclusiveMinimum === "number" ? s.exclusiveMinimum + (integer ? 1 : 0.01) : undefined;
    let hi = typeof s.maximum === "number" ? s.maximum : typeof s.exclusiveMaximum === "number" ? s.exclusiveMaximum - (integer ? 1 : 0.01) : undefined;
    const n = name.toLowerCase();
    if (lo === undefined && hi === undefined) {
      if (/age/.test(n)) [lo, hi] = [18, 65];
      else if (/price|amount|total|cost|salary/.test(n)) [lo, hi] = [5, 500];
      else if (/year/.test(n)) [lo, hi] = [2015, 2026];
      else if (/lat/.test(n)) [lo, hi] = [-60, 60];
      else if (/lon|lng/.test(n)) [lo, hi] = [-120, 120];
      else if (/percent|rate|ratio/.test(n)) [lo, hi] = [0, 100];
      else if (/(^id$|count|qty|quantity|size|number)/.test(n)) [lo, hi] = [1, 100];
      else [lo, hi] = [0, 100];
    } else if (lo === undefined) lo = (hi as number) - 100;
    else if (hi === undefined) hi = lo + 100;
    let v = lo + this.rnd() * ((hi as number) - lo);
    const step = typeof s.multipleOf === "number" && s.multipleOf > 0 ? s.multipleOf : integer ? 1 : 0;
    if (step) {
      let k = Math.round(v / step);
      while (k * step < lo) k++;
      while (k * step > (hi as number)) k--;
      v = k * step;
      return Number(v.toFixed(10));
    }
    return Number(v.toFixed(2));
  }
}

export function generateJsonSample(input: string, options: Partial<JsonSchemaSampleGeneratorOptions>): TransformResult {
  const o: JsonSchemaSampleGeneratorOptions = {
    fill: options.fill ?? "all",
    useExamples: options.useExamples ?? true,
    smartValues: options.smartValues ?? true,
    arrayLength: options.arrayLength ?? 2,
    variant: options.variant ?? 0,
    seed: options.seed ?? 1,
    count: options.count ?? 1,
    maxDepth: options.maxDepth ?? 5,
    format: options.format ?? "pretty",
  };
  if (!input.trim()) return { output: "", error: null };
  let schema: unknown;
  try {
    schema = JSON.parse(input);
  } catch (e) {
    const m = /position (\d+)/.exec((e as Error).message);
    const line = m ? input.slice(0, Number(m[1])).split("\n").length : undefined;
    return { output: "", error: { message: `Invalid JSON schema: ${(e as Error).message}`, line } };
  }
  if (!isObj(schema) && typeof schema !== "boolean") return { output: "", error: { message: "A JSON Schema must be an object." } };
  const root = isObj(schema) ? schema : {};
  const samples: unknown[] = [];
  for (let i = 0; i < o.count; i++) samples.push(new Gen(root, o, o.seed + i * 7919).value(schema, 0));
  if (o.format === "ndjson") return { output: samples.map((s) => JSON.stringify(s)).join("\n"), error: null };
  const data = o.count === 1 ? samples[0] : samples;
  return { output: o.format === "compact" ? JSON.stringify(data) : JSON.stringify(data, null, 2), error: null };
}

import type { TransformResult } from "@/lib/tool-transform";
import type { JsonSchemaValidatorOptions } from "./schema";

type Schema = boolean | Record<string, unknown>;
export interface Issue { path: string; keyword: string; message: string }

const typeOf = (v: unknown): string => (v === null ? "null" : Array.isArray(v) ? "array" : Number.isInteger(v) ? "integer" : typeof v);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const ptr = (path: string, key: string | number) => `${path}/${String(key).replace(/~/g, "~0").replace(/\//g, "~1")}`;

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === (b as unknown[]).length && a.every((x, i) => deepEqual(x, (b as unknown[])[i]));
  const ka = Object.keys(a as object), kb = Object.keys(b as object);
  return ka.length === kb.length && ka.every((k) => deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

const FORMATS: Record<string, (s: string) => boolean> = {
  email: (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s),
  uri: (s) => /^[a-zA-Z][a-zA-Z0-9+.-]*:[^\s]*$/.test(s),
  "uri-reference": (s) => !/\s/.test(s),
  uuid: (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s),
  date: (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s); if (!m) return false; const d = new Date(Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!)); return d.getUTCMonth() === +m[2]! - 1 && d.getUTCDate() === +m[3]!; },
  time: (s) => /^([01]\d|2[0-3]):[0-5]\d:([0-5]\d|60)(\.\d+)?(Z|[+-]([01]\d|2[0-3]):[0-5]\d)$/i.test(s),
  "date-time": (s) => { const [d, t] = s.split(/[Tt ]/); return !!d && !!t && FORMATS.date!(d) && FORMATS.time!(t); },
  ipv4: (s) => /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/.test(s),
  ipv6: (s) => /^[0-9a-f:.]+$/i.test(s) && s.includes(":") && (s.match(/::/g) ?? []).length <= 1,
  hostname: (s) => s.length <= 253 && s.split(".").every((l) => /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i.test(l)),
  regex: (s) => { try { new RegExp(s, "u"); return true; } catch { return false; } },
};

class Validator {
  issues: Issue[] = [];
  private depth = 0;
  constructor(private root: Schema, private assertFormats: boolean) {}

  resolve(ref: string): Schema {
    if (!ref.startsWith("#")) throw new Error(`Only local $ref values ("#/...") are supported, got "${ref}".`);
    let cur: unknown = this.root;
    for (const raw of ref.slice(1).split("/").filter(Boolean)) {
      const key = decodeURIComponent(raw).replace(/~1/g, "/").replace(/~0/g, "~");
      if (!isObj(cur) && !Array.isArray(cur)) throw new Error(`$ref "${ref}" does not resolve.`);
      cur = (cur as Record<string, unknown>)[key];
    }
    if (cur === undefined) throw new Error(`$ref "${ref}" does not resolve.`);
    return cur as Schema;
  }

  /** Returns true when valid. When collect is false nothing is recorded (used by anyOf/oneOf/not/if). */
  check(v: unknown, s: Schema, path: string, collect = true): boolean {
    if (++this.depth > 200) throw new Error("Schema recursion is too deep (circular $ref without a base case?).");
    try { return this.inner(v, s, path, collect); } finally { this.depth--; }
  }

  private fail(collect: boolean, path: string, keyword: string, message: string): false {
    if (collect) this.issues.push({ path: path || "/", keyword, message });
    return false;
  }

  private inner(v: unknown, s: Schema, path: string, collect: boolean): boolean {
    if (s === true) return true;
    if (s === false) return this.fail(collect, path, "false", "no value is allowed here");
    let ok = true;
    const f = (kw: string, msg: string) => { ok = this.fail(collect, path, kw, msg) && ok; };
    const t = typeOf(v);

    if (typeof s.$ref === "string") ok = this.check(v, this.resolve(s.$ref), path, collect) && ok;

    if (s.type !== undefined) {
      const types = Array.isArray(s.type) ? (s.type as string[]) : [s.type as string];
      if (!types.some((x) => x === t || (x === "number" && t === "integer"))) f("type", `expected ${types.join(" or ")}, got ${t}`);
    }
    if (Array.isArray(s.enum) && !s.enum.some((e) => deepEqual(e, v))) f("enum", `must be one of ${JSON.stringify(s.enum)}`);
    if ("const" in s && !deepEqual(s.const, v)) f("const", `must equal ${JSON.stringify(s.const)}`);

    if (typeof v === "number") {
      if (typeof s.minimum === "number" && v < s.minimum) f("minimum", `must be >= ${s.minimum}`);
      if (typeof s.maximum === "number" && v > s.maximum) f("maximum", `must be <= ${s.maximum}`);
      if (typeof s.exclusiveMinimum === "number" && v <= s.exclusiveMinimum) f("exclusiveMinimum", `must be > ${s.exclusiveMinimum}`);
      if (typeof s.exclusiveMaximum === "number" && v >= s.exclusiveMaximum) f("exclusiveMaximum", `must be < ${s.exclusiveMaximum}`);
      if (typeof s.multipleOf === "number" && s.multipleOf > 0) { const q = v / s.multipleOf; if (Math.abs(q - Math.round(q)) > 1e-9) f("multipleOf", `must be a multiple of ${s.multipleOf}`); }
    }
    if (typeof v === "string") {
      const len = [...v].length;
      if (typeof s.minLength === "number" && len < s.minLength) f("minLength", `must have at least ${s.minLength} characters`);
      if (typeof s.maxLength === "number" && len > s.maxLength) f("maxLength", `must have at most ${s.maxLength} characters`);
      if (typeof s.pattern === "string" && !new RegExp(s.pattern, "u").test(v)) f("pattern", `must match ${s.pattern}`);
      if (this.assertFormats && typeof s.format === "string" && FORMATS[s.format] && !FORMATS[s.format]!(v)) f("format", `must be a valid ${s.format}`);
    }
    if (Array.isArray(v)) {
      if (typeof s.minItems === "number" && v.length < s.minItems) f("minItems", `must have at least ${s.minItems} items`);
      if (typeof s.maxItems === "number" && v.length > s.maxItems) f("maxItems", `must have at most ${s.maxItems} items`);
      if (s.uniqueItems === true) for (let i = 0; i < v.length; i++) for (let j = 0; j < i; j++) if (deepEqual(v[i], v[j])) { f("uniqueItems", `items ${j} and ${i} are equal`); i = v.length; break; }
      let prefixLen = 0;
      if (Array.isArray(s.prefixItems)) { prefixLen = s.prefixItems.length; s.prefixItems.forEach((ps, i) => { if (i < v.length) ok = this.check(v[i], ps as Schema, ptr(path, i), collect) && ok; }); }
      if (Array.isArray(s.items)) { prefixLen = s.items.length; s.items.forEach((ps, i) => { if (i < v.length) ok = this.check(v[i], ps as Schema, ptr(path, i), collect) && ok; }); if (s.additionalItems !== undefined) for (let i = prefixLen; i < v.length; i++) ok = this.check(v[i], s.additionalItems as Schema, ptr(path, i), collect) && ok; }
      else if (s.items !== undefined) for (let i = prefixLen; i < v.length; i++) ok = this.check(v[i], s.items as Schema, ptr(path, i), collect) && ok;
      if (s.contains !== undefined) {
        const n = v.filter((x, i) => this.check(x, s.contains as Schema, ptr(path, i), false)).length;
        const min = typeof s.minContains === "number" ? s.minContains : 1;
        if (n < min) f("contains", `must contain at least ${min} matching item${min === 1 ? "" : "s"} (found ${n})`);
        if (typeof s.maxContains === "number" && n > s.maxContains) f("maxContains", `must contain at most ${s.maxContains} matching items (found ${n})`);
      }
    }
    if (isObj(v)) {
      const keys = Object.keys(v);
      if (typeof s.minProperties === "number" && keys.length < s.minProperties) f("minProperties", `must have at least ${s.minProperties} properties`);
      if (typeof s.maxProperties === "number" && keys.length > s.maxProperties) f("maxProperties", `must have at most ${s.maxProperties} properties`);
      if (Array.isArray(s.required)) for (const r of s.required as string[]) if (!(r in v)) f("required", `missing required property "${r}"`);
      const props = isObj(s.properties) ? s.properties : {};
      const patterns = isObj(s.patternProperties) ? Object.entries(s.patternProperties).map(([p, ps]) => [new RegExp(p, "u"), ps] as const) : [];
      for (const k of keys) {
        let matched = false;
        if (k in props) { matched = true; ok = this.check(v[k], props[k] as Schema, ptr(path, k), collect) && ok; }
        for (const [re, ps] of patterns) if (re.test(k)) { matched = true; ok = this.check(v[k], ps as Schema, ptr(path, k), collect) && ok; }
        if (!matched && s.additionalProperties !== undefined) {
          if (s.additionalProperties === false) ok = this.fail(collect, ptr(path, k), "additionalProperties", `property "${k}" is not allowed`) && ok;
          else ok = this.check(v[k], s.additionalProperties as Schema, ptr(path, k), collect) && ok;
        }
        if (s.propertyNames !== undefined && !this.check(k, s.propertyNames as Schema, ptr(path, k), false)) f("propertyNames", `property name "${k}" is invalid`);
      }
      const depReq = isObj(s.dependentRequired) ? s.dependentRequired : {};
      const legacy = isObj(s.dependencies) ? s.dependencies : {};
      for (const [k, dep] of [...Object.entries(depReq), ...Object.entries(legacy)]) {
        if (!(k in v)) continue;
        if (Array.isArray(dep)) { for (const r of dep as string[]) if (!(r in v)) f("dependentRequired", `"${k}" requires "${r}"`); }
        else ok = this.check(v, dep as Schema, path, collect) && ok;
      }
      if (isObj(s.dependentSchemas)) for (const [k, ds] of Object.entries(s.dependentSchemas)) if (k in v) ok = this.check(v, ds as Schema, path, collect) && ok;
    }

    if (Array.isArray(s.allOf)) for (const sub of s.allOf) ok = this.check(v, sub as Schema, path, collect) && ok;
    if (Array.isArray(s.anyOf) && !s.anyOf.some((sub) => this.check(v, sub as Schema, path, false))) f("anyOf", "must match at least one schema in anyOf");
    if (Array.isArray(s.oneOf)) {
      const n = s.oneOf.filter((sub) => this.check(v, sub as Schema, path, false)).length;
      if (n !== 1) f("oneOf", `must match exactly one schema in oneOf (matched ${n})`);
    }
    if (s.not !== undefined && this.check(v, s.not as Schema, path, false)) f("not", "must not match the schema in not");
    if (s.if !== undefined) {
      const cond = this.check(v, s.if as Schema, path, false);
      if (cond && s.then !== undefined) ok = this.check(v, s.then as Schema, path, collect) && ok;
      if (!cond && s.else !== undefined) ok = this.check(v, s.else as Schema, path, collect) && ok;
    }
    return ok;
  }
}

export function validate(data: unknown, schema: Schema, assertFormats = true): Issue[] {
  const val = new Validator(schema, assertFormats);
  val.check(data, schema, "");
  const seen = new Set<string>();
  return val.issues.filter((i) => { const k = `${i.path}|${i.keyword}|${i.message}`; if (seen.has(k)) return false; seen.add(k); return true; });
}

function parse(label: string, text: string): { value?: unknown; error?: string } {
  try { return { value: JSON.parse(text) }; } catch (e) { return { error: `${label} is not valid JSON: ${(e as Error).message}` }; }
}

export function runJsonSchemaValidator(input: string, schemaText: string, options: JsonSchemaValidatorOptions): TransformResult {
  if (!input.trim() || !schemaText.trim()) return { output: "", error: null };
  const s = parse("Schema", schemaText);
  if (s.error) return { output: "", error: { message: s.error } };
  if (typeof s.value !== "boolean" && !isObj(s.value)) return { output: "", error: { message: "Schema must be a JSON object or boolean." } };
  const d = parse("Data", input);
  if (d.error) return { output: "", error: { message: d.error } };
  let issues: Issue[];
  try { issues = validate(d.value, s.value as Schema, options.assertFormats); } catch (e) { return { output: "", error: { message: (e as Error).message } }; }
  const unsupported = ["unevaluatedProperties", "unevaluatedItems", "$dynamicRef", "$recursiveRef"].filter((k) => schemaText.includes(`"${k}"`));
  const note = unsupported.length ? `\n\nNote: ${unsupported.join(", ")} ${unsupported.length > 1 ? "are" : "is"} not evaluated by this validator.` : "";
  if (issues.length === 0) return { output: `Valid. The data matches the schema.${note}`, error: null };
  return { output: `Invalid: ${issues.length} problem${issues.length > 1 ? "s" : ""}\n\n${issues.map((i) => `${i.path}  [${i.keyword}]  ${i.message}`).join("\n")}${note}`, error: null };
}

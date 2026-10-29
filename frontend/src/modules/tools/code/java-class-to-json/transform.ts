import type { TransformResult } from "@/lib/tool-transform";
import type { JavaClassToJsonOptions } from "./schema";

export interface JField { name: string; json: string; type: string; ignored: boolean }
export interface JType { name: string; kind: "class" | "record" | "enum"; fields: JField[]; constants: string[] }

const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "").replace(/"(?:[^"\\]|\\.)*"/g, (m) => m.replace(/[{};]/g, " "));

function matchClose(s: string, open: number, o = "{", c = "}"): number {
  let d = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === o) d++;
    else if (s[i] === c && --d === 0) return i;
  }
  return s.length - 1;
}

/** Remove nested {...} blocks so only depth-1 statements of a body remain. */
function flatten(body: string): string {
  let out = "", d = 0;
  for (const ch of body) {
    if (ch === "{") { d++; continue; }
    if (ch === "}") { d--; if (d === 0) out += ";"; continue; }
    if (d === 0) out += ch;
  }
  return out;
}

function splitTop(s: string, sep = ","): string[] {
  const out: string[] = [];
  let d = 0, cur = "";
  for (const ch of s) {
    if ("<([".includes(ch)) d++;
    if (">)]".includes(ch)) d--;
    if (ch === sep && d === 0) { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

const annValue = (anns: string, name: string): string | null => {
  const m = new RegExp(`@${name}\\s*\\(\\s*(?:value\\s*=\\s*)?"([^"]*)"`).exec(anns);
  return m ? m[1]! : null;
};

export function parseJava(src: string): JType[] {
  const code = stripComments(src);
  const types: JType[] = [];
  const decl = /\b(class|record|enum|interface)\s+([A-Z]\w*)\s*(<[^>{]*>)?/g;
  let m: RegExpExecArray | null;
  while ((m = decl.exec(code))) {
    const kind = m[1]!;
    if (kind === "interface") continue;
    const name = m[2]!;
    let compsEnd = decl.lastIndex;
    const fields: JField[] = [];
    if (kind === "record") {
      const open = code.indexOf("(", decl.lastIndex);
      const close = matchClose(code, open, "(", ")");
      for (const comp of splitTop(code.slice(open + 1, close))) {
        const f = parseDecl(comp.trim());
        if (f) fields.push(f);
      }
      compsEnd = close;
    }
    const bodyOpen = code.indexOf("{", compsEnd);
    if (bodyOpen < 0) continue;
    const bodyClose = matchClose(code, bodyOpen);
    const body = code.slice(bodyOpen + 1, bodyClose);
    const constants: string[] = [];
    if (kind === "enum") {
      const head = flatten(body).split(";")[0] ?? "";
      for (const c of splitTop(head)) { const id = /^\s*(?:@\w+(?:\([^)]*\))?\s*)*([A-Z_][A-Z0-9_]*)/.exec(c); if (id) constants.push(id[1]!); }
    } else if (kind === "class") {
      for (const stmt of flatten(body).split(";")) {
        const s = stmt.trim();
        if (!s || /\bstatic\b/.test(s) || /\b(class|enum|record|interface)\s+[A-Z]/.test(s)) continue;
        const beforeEq = s.split("=")[0]!;
        if (beforeEq.replace(/@\w+\s*\([^)]*\)/g, "").includes("(")) continue;
        const decls = splitTop(beforeEq);
        const first = parseDecl(decls[0]!.trim());
        if (!first) continue;
        fields.push(first);
        for (const extra of decls.slice(1)) { const n = extra.trim().replace(/\[\]$/, ""); if (/^\w+$/.test(n)) fields.push({ ...first, name: n, json: n }); }
      }
    }
    types.push({ name, kind: kind as JType["kind"], fields, constants });
  }
  return types;
}

function parseDecl(s: string): JField | null {
  const anns = (s.match(/@[\w.]+(\s*\([^)]*\))?/g) ?? []).join(" ");
  const rest = s.replace(/@[\w.]+(\s*\([^)]*\))?/g, " ").replace(/\b(public|protected|private|final|transient|volatile)\b/g, " ").trim();
  const m = /^([\w.]+(?:\s*<.*>)?(?:\s*\[\s*\])*|[\w.]+\.\.\.)\s+(\w+)(\s*\[\s*\])?$/.exec(rest.replace(/\s+/g, " "));
  if (!m) return null;
  const type = (m[1]! + (m[3] ? "[]" : "")).replace(/\s+/g, "").replace(/\.\.\.$/, "[]");
  const name = m[2]!;
  if (/^(return|throw|new)$/.test(type)) return null;
  return { name, json: annValue(anns, "JsonProperty") ?? annValue(anns, "SerializedName") ?? name, type, ignored: /@JsonIgnore\b/.test(anns) || /\btransient\b/.test(s) };
}

const snake = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2").toLowerCase();

function genericArgs(t: string): string[] {
  const i = t.indexOf("<");
  return i < 0 ? [] : splitTop(t.slice(i + 1, t.lastIndexOf(">"))).map((x) => x.trim().replace(/^\?\s*(extends|super)\s+/, ""));
}
const rawName = (t: string) => t.replace(/<.*$/, "").replace(/\[\]$/, "").split(".").pop()!;

const STRING_SAMPLES: [RegExp, string][] = [
  [/email/i, "user@example.com"], [/phone|mobile/i, "+91 98765 43210"], [/url|uri|website|link/i, "https://example.com"],
  [/^(first|full|display|nick|user|given)?name$/i, "Asha"], [/last.?name|surname/i, "Rao"], [/city/i, "Pune"], [/country/i, "IN"], [/currency/i, "INR"],
  [/status|state/i, "ACTIVE"], [/^id$|.Id$|uuid|reference|ref$/i, "a1b2c3d4"], [/iban/i, "GB82WEST12345698765432"], [/zip|postal|pin.?code/i, "411001"],
];

export function sample(type: string, field: string, types: Map<string, JType>, seen: Set<string>, naming: Naming = "as-is"): unknown {
  const t = type.trim();
  if (t.endsWith("[]")) return t === "byte[]" ? "AQIDBA==" : [sample(t.slice(0, -2), field, types, seen, naming)];
  const raw = rawName(t);
  const args = genericArgs(t);
  if (/^(List|ArrayList|LinkedList|Set|HashSet|LinkedHashSet|TreeSet|SortedSet|Collection|Iterable|Stream|Queue|Deque)$/.test(raw)) return [sample(args[0] ?? "Object", field, types, seen, naming)];
  if (/^(Map|HashMap|LinkedHashMap|TreeMap|SortedMap|ConcurrentHashMap|EnumMap)$/.test(raw)) return { key: sample(args[1] ?? "Object", field, types, seen, naming) };
  if (/^(Optional|AtomicReference|Mono|CompletableFuture|ResponseEntity)$/.test(raw)) return sample(args[0] ?? "Object", field, types, seen, naming);
  if (raw === "OptionalInt" || raw === "OptionalLong") return 1;
  switch (raw) {
    case "String": case "CharSequence": return STRING_SAMPLES.find(([re]) => re.test(field))?.[1] ?? "string";
    case "char": case "Character": return "a";
    case "boolean": case "Boolean": case "AtomicBoolean": return true;
    case "byte": case "short": case "int": case "long": case "Byte": case "Short": case "Integer": case "Long": case "BigInteger": case "AtomicInteger": case "AtomicLong": return 1;
    case "float": case "double": case "Float": case "Double": case "BigDecimal": return 10.5;
    case "LocalDate": return "2024-01-31";
    case "LocalDateTime": return "2024-01-31T10:15:30";
    case "LocalTime": return "10:15:30";
    case "OffsetDateTime": case "ZonedDateTime": case "Instant": return "2024-01-31T10:15:30Z";
    case "Date": case "Timestamp": case "Calendar": return 1706696130000;
    case "YearMonth": return "2024-01";
    case "Year": return 2024;
    case "Duration": return "PT15M";
    case "Period": return "P1M";
    case "UUID": return "3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e";
    case "URI": case "URL": return "https://example.com";
    case "Currency": return "INR";
    case "Locale": return "en-IN";
    case "JsonNode": case "ObjectNode": case "Object": return {};
  }
  const known = types.get(raw);
  if (known?.kind === "enum") return known.constants[0] ?? "VALUE";
  if (known) {
    if (seen.has(raw)) return null;
    return objectSample(known, types, new Set([...seen, raw]), naming);
  }
  return {};
}

type Naming = JavaClassToJsonOptions["naming"];
const jsonName = (f: JField, naming: Naming) => (f.json !== f.name ? f.json : naming === "snake" ? snake(f.name) : f.name);

function objectSample(t: JType, types: Map<string, JType>, seen: Set<string>, naming: Naming): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const f of t.fields) if (!f.ignored) o[jsonName(f, naming)] = sample(f.type, f.name, types, seen, naming);
  return o;
}

export function tsType(type: string, types: Map<string, JType>): string {
  const t = type.trim();
  if (t === "byte[]") return "string";
  if (t.endsWith("[]")) return `${wrap(tsType(t.slice(0, -2), types))}[]`;
  const raw = rawName(t);
  const args = genericArgs(t);
  if (/^(List|ArrayList|LinkedList|Set|HashSet|LinkedHashSet|TreeSet|SortedSet|Collection|Iterable|Stream|Queue|Deque)$/.test(raw)) return `${wrap(tsType(args[0] ?? "Object", types))}[]`;
  if (/^(Map|HashMap|LinkedHashMap|TreeMap|SortedMap|ConcurrentHashMap|EnumMap)$/.test(raw)) return `Record<string, ${tsType(args[1] ?? "Object", types)}>`;
  if (raw === "Optional") return `${tsType(args[0] ?? "Object", types)} | null`;
  if (/^(String|CharSequence|char|Character|LocalDate|LocalDateTime|LocalTime|OffsetDateTime|ZonedDateTime|Instant|YearMonth|Duration|Period|UUID|URI|URL|Currency|Locale)$/.test(raw)) return "string";
  if (/^(byte|short|int|long|float|double|Byte|Short|Integer|Long|BigInteger|BigDecimal|Float|Double|Date|Timestamp|Calendar|Year|AtomicInteger|AtomicLong)$/.test(raw)) return "number";
  if (/^(boolean|Boolean|AtomicBoolean)$/.test(raw)) return "boolean";
  if (types.has(raw)) return raw;
  return `unknown /* ${raw} */`;
}
const wrap = (s: string) => (/[ |]/.test(s) ? `(${s})` : s);

export function runJavaClassToJson(input: string, options: JavaClassToJsonOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  const list = parseJava(input);
  if (list.length === 0) return { output: "", error: { message: "No class, record or enum found. Paste Java source with at least one type declaration." } };
  const types = new Map(list.map((t) => [t.name, t]));
  const root = list.find((t) => t.kind !== "enum") ?? list[0]!;
  const parts: string[] = [];
  if (options.output !== "typescript") {
    const json = root.kind === "enum" ? root.constants[0] ?? null : objectSample(root, types, new Set([root.name]), options.naming);
    parts.push(JSON.stringify(json, null, 2));
  }
  if (options.output !== "json") {
    const ts = list.map((t) => {
      if (t.kind === "enum") return `export type ${t.name} = ${t.constants.map((c) => JSON.stringify(c)).join(" | ") || "string"};`;
      const props = t.fields.filter((f) => !f.ignored).map((f) => {
        const key = jsonName(f, options.naming);
        const safeKey = /^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key);
        const type = tsType(f.type, types);
        const optional = /^Optional</.test(f.type);
        return `  ${safeKey}${optional ? "?" : ""}: ${type};`;
      });
      return `export interface ${t.name} {\n${props.join("\n")}\n}`;
    });
    parts.push(ts.join("\n\n"));
  }
  const notes: string[] = [];
  if (list.some((t) => t.fields.some((f) => /^(Date|Timestamp|Calendar)$/.test(rawName(f.type))))) notes.push("// java.util.Date is shown as epoch millis (Jackson's default); java.time types assume WRITE_DATES_AS_TIMESTAMPS is off, as in Spring Boot.");
  return { output: [...parts, ...notes].join("\n\n"), error: null };
}

import type { TransformResult } from "@/lib/tool-transform";
import type { Json5JsoncConverterOptions } from "./schema";

class Json5Error extends Error {
  constructor(msg: string, public line: number, public column: number) { super(msg); }
}

const WS = /\s/; // \s already covers BOM, NBSP and U+2028/2029
const IDENT_START = /[A-Za-z_$]/;
const IDENT_PART = /[A-Za-z0-9_$]/;

/** Lenient JSON5/JSONC parser: comments, trailing commas, single quotes, unquoted keys, hex, +/-, Infinity, NaN. */
export function parseJson5(text: string): unknown {
  let i = 0;
  const pos = () => {
    const before = text.slice(0, i);
    const lines = before.split("\n");
    return { line: lines.length, column: lines[lines.length - 1]!.length + 1 };
  };
  const fail = (msg: string): never => {
    const p = pos();
    throw new Json5Error(`${msg} at line ${p.line}, column ${p.column}`, p.line, p.column);
  };
  const skip = () => {
    for (;;) {
      const c = text[i];
      if (c !== undefined && WS.test(c)) i++;
      else if (c === "/" && text[i + 1] === "/") { while (i < text.length && text[i] !== "\n") i++; }
      else if (c === "/" && text[i + 1] === "*") {
        const end = text.indexOf("*/", i + 2);
        if (end < 0) fail("Unterminated block comment");
        i = end + 2;
      } else return;
    }
  };
  const parseString = (): string => {
    const q = text[i++]!;
    let out = "";
    for (;;) {
      const c = text[i];
      if (c === undefined) fail("Unterminated string");
      i++;
      if (c === q) return out;
      if (c === "\n") { i--; fail("Unescaped newline in string"); }
      if (c !== "\\") { out += c; continue; }
      const e = text[i++];
      switch (e) {
        case "n": out += "\n"; break;
        case "t": out += "\t"; break;
        case "r": out += "\r"; break;
        case "b": out += "\b"; break;
        case "f": out += "\f"; break;
        case "v": out += "\v"; break;
        case "0": out += "\0"; break;
        case "\n": break; // line continuation
        case "x": { const h = text.slice(i, i + 2); if (!/^[0-9a-fA-F]{2}$/.test(h)) fail("Invalid \\x escape"); out += String.fromCharCode(parseInt(h, 16)); i += 2; break; }
        case "u": { const h = text.slice(i, i + 4); if (!/^[0-9a-fA-F]{4}$/.test(h)) fail("Invalid \\u escape"); out += String.fromCharCode(parseInt(h, 16)); i += 4; break; }
        case undefined: fail("Unterminated string"); break;
        default: out += e;
      }
    }
  };
  const parseNumber = (): number => {
    const m = /^[+-]?(?:Infinity|NaN|0[xX][0-9a-fA-F]+|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/.exec(text.slice(i));
    if (!m) return fail("Invalid number");
    i += m[0].length;
    const s = m[0];
    const sign = s[0] === "-" ? -1 : 1;
    const body = s.replace(/^[+-]/, "");
    if (body === "Infinity") return sign * Infinity;
    if (body === "NaN") return NaN;
    if (/^0[xX]/.test(body)) return sign * parseInt(body, 16);
    return sign * Number(body);
  };
  const parseKey = (): string => {
    const c = text[i];
    if (c === '"' || c === "'") return parseString();
    if (c !== undefined && IDENT_START.test(c)) {
      const st = i;
      while (i < text.length && IDENT_PART.test(text[i]!)) i++;
      return text.slice(st, i);
    }
    return fail("Expected property name");
  };
  const parseValue = (): unknown => {
    skip();
    const c = text[i];
    if (c === undefined) return fail("Unexpected end of input");
    if (c === "{") {
      i++;
      const obj: Record<string, unknown> = {};
      for (;;) {
        skip();
        if (text[i] === "}") { i++; return obj; }
        const k = parseKey();
        skip();
        if (text[i] !== ":") fail("Expected ':'");
        i++;
        Object.defineProperty(obj, k, { value: parseValue(), enumerable: true, writable: true, configurable: true });
        skip();
        if (text[i] === ",") { i++; continue; }
        if (text[i] === "}") { i++; return obj; }
        fail("Expected ',' or '}'");
      }
    }
    if (c === "[") {
      i++;
      const arr: unknown[] = [];
      for (;;) {
        skip();
        if (text[i] === "]") { i++; return arr; }
        arr.push(parseValue());
        skip();
        if (text[i] === ",") { i++; continue; }
        if (text[i] === "]") { i++; return arr; }
        fail("Expected ',' or ']'");
      }
    }
    if (c === '"' || c === "'") return parseString();
    for (const [lit, val] of [["true", true], ["false", false], ["null", null]] as const) {
      if (text.startsWith(lit, i) && !IDENT_PART.test(text[i + lit.length] ?? " ")) { i += lit.length; return val; }
    }
    return parseNumber();
  };
  const v = parseValue();
  skip();
  if (i < text.length) fail("Unexpected content after the value");
  return v;
}

const isIdent = (k: string) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k);

export function stringifyJson5(value: unknown, indent: string, trailing: boolean, level = 0): string {
  if (value === null) return "null";
  if (typeof value === "number") return Number.isNaN(value) ? "NaN" : value === Infinity ? "Infinity" : value === -Infinity ? "-Infinity" : String(value);
  if (typeof value === "boolean") return String(value);
  if (typeof value === "string") {
    const q = value.includes("'") && !value.includes('"') ? '"' : "'";
    const body = value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t").split(q).join("\\" + q);
    return q + body + q;
  }
  const pad = (n: number) => (indent ? "\n" + indent.repeat(n) : "");
  if (Array.isArray(value)) {
    if (!value.length) return "[]";
    const items = value.map((v) => pad(level + 1) + stringifyJson5(v, indent, trailing, level + 1));
    return "[" + items.join(",") + (trailing && indent ? "," : "") + pad(level) + "]";
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (!entries.length) return "{}";
  const items = entries.map(([k, v]) => pad(level + 1) + (isIdent(k) ? k : stringifyJson5(k, indent, false)) + ": " + stringifyJson5(v, indent, trailing, level + 1));
  return "{" + items.join(",") + (trailing && indent ? "," : "") + pad(level) + "}";
}

export function convertJson5(input: string, options: Json5JsoncConverterOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  const indent = options.indent === "tab" ? "\t" : " ".repeat(Number(options.indent));
  try {
    const v = parseJson5(input);
    if (options.direction === "to-json5") return { output: stringifyJson5(v, indent, options.trailingCommas), error: null };
    const json = JSON.stringify(v, null, indent);
    if (json === undefined) return { output: "", error: { message: "Value cannot be represented as JSON" } };
    return { output: json, error: null };
  } catch (e) {
    if (e instanceof Json5Error) return { output: "", error: { message: e.message, line: e.line, column: e.column } };
    return { output: "", error: { message: (e as Error).message } };
  }
}

/**
 * A JSON parser/printer that keeps numbers exactly as written.
 *
 * JSON.parse turns every number into a float64, so 64-bit IDs, account
 * numbers and long decimals silently change (12345678901234567890 becomes
 * 12345678901234567000, 0.10000000000000000001 becomes 0.1). Formatting tools
 * must not alter data, so they parse into this tree instead: numbers keep
 * their source text, objects keep key order (and duplicate keys).
 */

export type JNode =
  | { kind: "object"; entries: Array<[string, JNode]> }
  | { kind: "array"; items: JNode[] }
  | { kind: "string"; value: string }
  | { kind: "number"; raw: string }
  | { kind: "literal"; value: true | false | null };

export class JsonSyntaxError extends Error {
  constructor(
    message: string,
    readonly line: number,
    readonly column: number,
  ) {
    super(`${message} at line ${line}, column ${column}`);
    this.name = "JsonSyntaxError";
  }
}

export function parseJsonLossless(text: string): JNode {
  let i = 0;

  function fail(message: string, at = i): never {
    const before = text.slice(0, at);
    const line = before.split("\n").length;
    const column = at - before.lastIndexOf("\n");
    throw new JsonSyntaxError(message, line, column);
  }

  function ws() {
    while (i < text.length) {
      const c = text.charCodeAt(i);
      if (c === 32 || c === 9 || c === 10 || c === 13) i++;
      else break;
    }
  }

  function describe(at: number): string {
    return at >= text.length ? "end of input" : JSON.stringify(text[at]);
  }

  function value(depth: number): JNode {
    if (depth > 512) fail("Nesting is deeper than 512 levels");
    ws();
    const c = text[i];
    if (c === "{") return object(depth);
    if (c === "[") return array(depth);
    if (c === '"') return { kind: "string", value: string() };
    if (c === "-" || (c !== undefined && c >= "0" && c <= "9")) return number();
    for (const [word, v] of [["true", true], ["false", false], ["null", null]] as const) {
      if (text.startsWith(word, i)) {
        i += word.length;
        return { kind: "literal", value: v };
      }
    }
    return fail(`Unexpected ${describe(i)}`);
  }

  function object(depth: number): JNode {
    i++;
    const entries: Array<[string, JNode]> = [];
    ws();
    if (text[i] === "}") {
      i++;
      return { kind: "object", entries };
    }
    for (;;) {
      ws();
      if (text[i] !== '"') fail(`Expected a property name in double quotes but found ${describe(i)}`);
      const key = string();
      ws();
      if (text[i] !== ":") fail(`Expected ":" after property name but found ${describe(i)}`);
      i++;
      entries.push([key, value(depth + 1)]);
      ws();
      if (text[i] === ",") {
        i++;
        ws();
        if (text[i] === "}") fail("Trailing comma before \"}\"");
        continue;
      }
      if (text[i] === "}") {
        i++;
        return { kind: "object", entries };
      }
      fail(`Expected "," or "}" but found ${describe(i)}`);
    }
  }

  function array(depth: number): JNode {
    i++;
    const items: JNode[] = [];
    ws();
    if (text[i] === "]") {
      i++;
      return { kind: "array", items };
    }
    for (;;) {
      items.push(value(depth + 1));
      ws();
      if (text[i] === ",") {
        i++;
        ws();
        if (text[i] === "]") fail("Trailing comma before \"]\"");
        continue;
      }
      if (text[i] === "]") {
        i++;
        return { kind: "array", items };
      }
      fail(`Expected "," or "]" but found ${describe(i)}`);
    }
  }

  function string(): string {
    const start = i;
    i++;
    let out = "";
    let chunk = i;
    for (;;) {
      if (i >= text.length) fail("Unterminated string", start);
      const c = text.charCodeAt(i);
      if (c === 34) {
        out += text.slice(chunk, i);
        i++;
        return out;
      }
      if (c < 32) fail("Control character in string (escape it as \\n, \\t or \\u00XX)");
      if (c === 92) {
        out += text.slice(chunk, i);
        const e = text[i + 1];
        const simple: Record<string, string> = { '"': '"', "\\": "\\", "/": "/", b: "\b", f: "\f", n: "\n", r: "\r", t: "\t" };
        if (e !== undefined && e in simple) {
          out += simple[e];
          i += 2;
        } else if (e === "u") {
          const hex = text.slice(i + 2, i + 6);
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) fail("Invalid \\u escape");
          out += String.fromCharCode(parseInt(hex, 16));
          i += 6;
        } else fail(`Invalid escape "\\${e ?? ""}"`);
        chunk = i;
        continue;
      }
      i++;
    }
  }

  function number(): JNode {
    const m = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(text.slice(i, i + 4096));
    if (!m) fail(`Invalid number`);
    i += m[0].length;
    return { kind: "number", raw: m[0] };
  }

  ws();
  if (i >= text.length) fail("Empty input");
  const root = value(0);
  ws();
  if (i < text.length) fail(`Unexpected ${describe(i)} after the end of the JSON value`);
  return root;
}

export interface StringifyOptions {
  /** Spaces or "\t"; 0 or "" prints minified. */
  indent?: number | string;
  sortKeys?: boolean;
  /** Write non-ASCII characters as \uXXXX escapes (for systems that are not UTF-8 clean). */
  escapeUnicode?: boolean;
  /** Keep arrays of numbers/strings/literals on one line when they fit in this width (0 = off). */
  inlineArraysUpTo?: number;
}

export function quoteJsonString(s: string, escapeUnicode = false): string {
  const q = JSON.stringify(s);
  return escapeUnicode ? q.replace(/[\u007f-￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`) : q;
}

export function stringifyJsonLossless(node: JNode, options: StringifyOptions = {}): string {
  const unit = typeof options.indent === "number" ? " ".repeat(options.indent) : (options.indent ?? "");
  const pretty = unit.length > 0;
  const inlineMax = options.inlineArraysUpTo ?? 0;

  function scalar(n: JNode): string | null {
    if (n.kind === "string") return quoteJsonString(n.value, options.escapeUnicode);
    if (n.kind === "number") return n.raw;
    if (n.kind === "literal") return String(n.value);
    return null;
  }

  function out(n: JNode, pad: string): string {
    const s = scalar(n);
    if (s !== null) return s;
    const inner = pad + unit;
    if (n.kind === "array") {
      if (n.items.length === 0) return "[]";
      if (!pretty) return `[${n.items.map((x) => out(x, "")).join(",")}]`;
      if (inlineMax > 0 && n.items.every((x) => x.kind !== "array" && x.kind !== "object")) {
        const flat = `[${n.items.map((x) => scalar(x)).join(", ")}]`;
        if (pad.length + flat.length <= inlineMax) return flat;
      }
      return `[\n${n.items.map((x) => inner + out(x, inner)).join(",\n")}\n${pad}]`;
    }
    if (n.kind !== "object") return "";
    if (n.entries.length === 0) return "{}";
    const entries = options.sortKeys ? [...n.entries].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)) : n.entries;
    const key = (k: string) => quoteJsonString(k, options.escapeUnicode);
    if (!pretty) return `{${entries.map(([k, v]) => `${key(k)}:${out(v, "")}`).join(",")}}`;
    return `{\n${entries.map(([k, v]) => `${inner}${key(k)}: ${out(v, inner)}`).join(",\n")}\n${pad}}`;
  }

  return out(node, "");
}

/** Converts to plain JS values (numbers become JS numbers; precision loss possible). */
export function toPlainValue(node: JNode): unknown {
  switch (node.kind) {
    case "object":
      return Object.fromEntries(node.entries.map(([k, v]) => [k, toPlainValue(v)]));
    case "array":
      return node.items.map(toPlainValue);
    case "string":
      return node.value;
    case "number":
      return Number(node.raw);
    default:
      return node.value;
  }
}

/** Numbers whose value changes when read as a JS number (useful to warn users). */
export function findImpreciseNumbers(node: JNode, limit = 5): string[] {
  const found: string[] = [];
  const walk = (n: JNode) => {
    if (found.length >= limit) return;
    if (n.kind === "number") {
      if (!sameNumber(n.raw)) found.push(n.raw);
    } else if (n.kind === "array") n.items.forEach(walk);
    else if (n.kind === "object") n.entries.forEach(([, v]) => walk(v));
  };
  walk(node);
  return found;
}

function sameNumber(raw: string): boolean {
  const n = Number(raw);
  if (!Number.isFinite(n)) return false;
  if (/^-?\d+$/.test(raw)) return BigInt(raw) === BigInt(n);
  // Decimals: compare significant digits after normalising both forms.
  return normalise(raw) === normalise(String(n));
}

function normalise(raw: string): string {
  const m = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(raw);
  if (!m) return raw;
  const [, sign, int, frac = "", exp = "0"] = m;
  let digits = (int + frac).replace(/^0+/, "");
  const lead = (int + frac).length - (int + frac).replace(/^0+/, "").length;
  digits = digits.replace(/0+$/, "");
  if (!digits) return "0";
  const e = Number(exp) + int!.length - lead;
  return `${sign}${digits}e${e}`;
}

import { dump as dumpYaml, load as loadYaml } from "js-yaml";
import type { TransformResult } from "@/lib/tool-transform";
import type { PropertiesYamlOptions } from "./schema";

type Container = Record<string, unknown> | unknown[];

/** Logical lines of a .properties file: strips comments, joins backslash continuations. */
export function logicalLines(text: string): string[] {
  const out: string[] = [];
  let buffer: string | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/^\s+/, "");
    if (buffer === null && (line === "" || line.startsWith("#") || line.startsWith("!"))) continue;
    const trailing = /(\\+)$/.exec(line);
    const continues = trailing !== null && trailing[1]!.length % 2 === 1;
    const piece = continues ? line.slice(0, -1) : line;
    buffer = (buffer ?? "") + piece;
    if (!continues) {
      out.push(buffer);
      buffer = null;
    }
  }
  if (buffer !== null) out.push(buffer);
  return out;
}

export function unescapeProperty(s: string): string {
  return s.replace(/\\(?:u([0-9a-fA-F]{4})|([\s\S]))/g, (_m, hex, ch) => {
    if (hex) return String.fromCharCode(parseInt(hex, 16));
    return ({ n: "\n", t: "\t", r: "\r", f: "\f" } as Record<string, string>)[ch] ?? ch;
  });
}

export function splitKeyValue(line: string): [string, string] {
  let i = 0;
  while (i < line.length) {
    const c = line[i]!;
    if (c === "\\") i += 2;
    else if (c === "=" || c === ":" || /\s/.test(c)) break;
    else i++;
  }
  const key = line.slice(0, i);
  let rest = line.slice(i).replace(/^\s*/, "");
  if (rest[0] === "=" || rest[0] === ":") rest = rest.slice(1).replace(/^\s*/, "");
  return [unescapeProperty(key), unescapeProperty(rest)];
}

function inferValue(v: string): unknown {
  if (v === "true") return true;
  if (v === "false") return false;
  if (/^-?(0|[1-9]\d{0,14})(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

function keyPath(key: string): (string | number)[] {
  const path: (string | number)[] = [];
  for (const part of key.split(".")) {
    const m = /^(.*?)((?:\[\d+\])+)$/.exec(part);
    if (m && m[1] !== "") {
      path.push(m[1]!);
      for (const idx of m[2]!.matchAll(/\[(\d+)\]/g)) path.push(Number(idx[1]));
    } else {
      path.push(part);
    }
  }
  return path;
}

export function propertiesToObject(text: string, infer: boolean): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  for (const line of logicalLines(text)) {
    const [key, rawValue] = splitKeyValue(line);
    if (key === "") continue;
    const value = infer ? inferValue(rawValue) : rawValue;
    const path = keyPath(key);
    let node: Container = root;
    for (let i = 0; i < path.length; i++) {
      const seg = path[i]!;
      const last = i === path.length - 1;
      const slot = node as Record<string | number, unknown>;
      if (last) {
        if (slot[seg] !== undefined && typeof slot[seg] === "object" && slot[seg] !== null) {
          throw new Error(`"${key}" is set to a value but is also a parent of other keys.`);
        }
        slot[seg] = value;
      } else {
        const next = path[i + 1]!;
        const existing = slot[seg];
        if (existing === undefined) slot[seg] = typeof next === "number" ? [] : {};
        else if (typeof existing !== "object" || existing === null) {
          throw new Error(`"${key}" conflicts with an earlier scalar value for "${path.slice(0, i + 1).join(".")}".`);
        }
        node = slot[seg] as Container;
      }
    }
  }
  return root;
}

function escapeValue(s: string, asciiOnly: boolean): string {
  let out = s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t");
  if (/^\s/.test(out)) out = "\\" + out;
  if (asciiOnly) out = out.replace(/[^\x20-\x7e]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
  return out;
}

function escapeKey(s: string): string {
  return s.replace(/([\s=:#!\\])/g, "\\$1");
}

export function flatten(value: unknown, prefix: string, out: [string, string][], asciiOnly: boolean): void {
  if (Array.isArray(value)) {
    if (value.length === 0) out.push([prefix, ""]);
    value.forEach((item, i) => flatten(item, `${prefix}[${i}]`, out, asciiOnly));
  } else if (typeof value === "object" && value !== null && !(value instanceof Date)) {
    const entries = Object.entries(value);
    if (entries.length === 0 && prefix) out.push([prefix, ""]);
    for (const [k, v] of entries) flatten(v, prefix ? `${prefix}.${k}` : k, out, asciiOnly);
  } else {
    const str = value === null || value === undefined ? "" : value instanceof Date ? value.toISOString() : String(value);
    out.push([prefix, escapeValue(str, asciiOnly)]);
  }
}

export function convertPropertiesYaml(input: string, options: PropertiesYamlOptions): TransformResult {
  if (input.trim().length === 0) return { output: "", error: null };
  try {
    if (options.mode === "properties-to-yaml") {
      const obj = propertiesToObject(input, options.inferTypes);
      return { output: dumpYaml(obj, { indent: 2, lineWidth: -1, noRefs: true }), error: null };
    }
    const parsed = loadYaml(input);
    if (typeof parsed !== "object" || parsed === null) {
      return { output: "", error: { message: "YAML must contain a mapping or list at the top level." } };
    }
    const pairs: [string, string][] = [];
    flatten(parsed, "", pairs, options.escapeUnicode);
    const lines = pairs.map(([k, v]) => `${escapeKey(k)}=${v}`);
    return { output: lines.join("\n") + "\n", error: null };
  } catch (e) {
    return { output: "", error: { message: e instanceof Error ? e.message : "Conversion failed." } };
  }
}

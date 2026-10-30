import type { TransformResult } from "@/lib/tool-transform";
import type { PunycodeMode, PunycodeOptions } from "./schema";

const BASE = 36;
const T_MIN = 1;
const T_MAX = 26;
const SKEW = 38;
const DAMP = 700;
const INITIAL_BIAS = 72;
const INITIAL_N = 128;
const DELIMITER = "-";
const MAX_INT = Number.MAX_SAFE_INTEGER;

function adapt(delta: number, numPoints: number, firstTime: boolean): number {
  let k = 0;
  let d = firstTime ? Math.floor(delta / DAMP) : delta >> 1;
  d += Math.floor(d / numPoints);
  for (; d > ((BASE - T_MIN) * T_MAX) >> 1; k += BASE) {
    d = Math.floor(d / (BASE - T_MIN));
  }
  return Math.floor(k + ((BASE - T_MIN + 1) * d) / (d + SKEW));
}

function digitToBasic(digit: number): number {
  return digit + 22 + 75 * (digit < 26 ? 1 : 0);
}

function basicToDigit(codePoint: number): number {
  if (codePoint >= 0x30 && codePoint < 0x3a) return codePoint - 0x30 + 26;
  if (codePoint >= 0x41 && codePoint < 0x5b) return codePoint - 0x41;
  if (codePoint >= 0x61 && codePoint < 0x7b) return codePoint - 0x61;
  return BASE;
}

export function encodeLabel(input: string): string {
  const output: string[] = [];
  const codePoints = Array.from(input).map((c) => c.codePointAt(0) as number);
  const basic = codePoints.filter((c) => c < 0x80);
  for (const c of basic) output.push(String.fromCharCode(c));
  let handled = basic.length;
  const basicLength = handled;
  if (basicLength > 0) output.push(DELIMITER);

  let n = INITIAL_N;
  let delta = 0;
  let bias = INITIAL_BIAS;

  while (handled < codePoints.length) {
    let m = Infinity;
    for (const c of codePoints) if (c >= n && c < m) m = c;
    const handledIncrement = handled + 1;
    if (m - n > Math.floor((MAX_INT - delta) / handledIncrement)) throw new RangeError("Overflow while encoding.");
    delta += (m - n) * handledIncrement;
    n = m;
    for (const c of codePoints) {
      if (c < n) {
        delta++;
        if (delta > MAX_INT) throw new RangeError("Overflow while encoding.");
      }
      if (c === n) {
        let q = delta;
        for (let k = BASE; ; k += BASE) {
          const t = k <= bias ? T_MIN : k >= bias + T_MAX ? T_MAX : k - bias;
          if (q < t) break;
          const qMinusT = q - t;
          const baseMinusT = BASE - t;
          output.push(String.fromCharCode(digitToBasic(t + (qMinusT % baseMinusT))));
          q = Math.floor(qMinusT / baseMinusT);
        }
        output.push(String.fromCharCode(digitToBasic(q)));
        bias = adapt(delta, handledIncrement, handled === basicLength);
        delta = 0;
        handled++;
      }
    }
    delta++;
    n++;
  }
  return output.join("");
}

export function decodeLabel(input: string): string {
  const output: string[] = [];
  let n = INITIAL_N;
  let i = 0;
  let bias = INITIAL_BIAS;

  let basicEnd = input.lastIndexOf(DELIMITER);
  if (basicEnd < 0) basicEnd = 0;
  for (let j = 0; j < basicEnd; j++) {
    const code = input.charCodeAt(j);
    if (code >= 0x80) throw new RangeError("Illegal input >= 0x80 in basic-code portion.");
    output.push(input[j]!);
  }

  let index = basicEnd > 0 ? basicEnd + 1 : 0;
  while (index < input.length) {
    const oldi = i;
    for (let w = 1, k = BASE; ; k += BASE) {
      if (index >= input.length) throw new RangeError("Invalid input.");
      const digit = basicToDigit(input.charCodeAt(index++));
      if (digit >= BASE) throw new RangeError("Invalid input.");
      if (digit > Math.floor((MAX_INT - i) / w)) throw new RangeError("Overflow while decoding.");
      i += digit * w;
      const t = k <= bias ? T_MIN : k >= bias + T_MAX ? T_MAX : k - bias;
      if (digit < t) break;
      const baseMinusT = BASE - t;
      if (w > Math.floor(MAX_INT / baseMinusT)) throw new RangeError("Overflow while decoding.");
      w *= baseMinusT;
    }
    const out = output.length + 1;
    bias = adapt(i - oldi, out, oldi === 0);
    if (Math.floor(i / out) > MAX_INT - n) throw new RangeError("Overflow while decoding.");
    n += Math.floor(i / out);
    i %= out;
    output.splice(i, 0, String.fromCodePoint(n));
    i++;
  }
  return output.join("");
}

function isAscii(s: string): boolean {

  return /^[\x00-\x7F]*$/.test(s);
}

export interface PunycodeResult extends TransformResult {
  warnings?: string[];
}

const DOTS = /[。．｡]/g;
const SCRIPTS = ["Latin", "Cyrillic", "Greek", "Armenian", "Hebrew", "Arabic", "Han", "Hiragana", "Katakana", "Hangul", "Thai", "Devanagari", "Georgian", "Cherokee"] as const;
const SCRIPT_RE = Object.fromEntries(SCRIPTS.map((sc) => [sc, new RegExp(`\\p{Script=${sc}}`, "u")])) as Record<(typeof SCRIPTS)[number], RegExp>;
// Han, Hiragana and Katakana mix legitimately in Japanese labels.
const JAPANESE = new Set(["Han", "Hiragana", "Katakana"]);
/** Cyrillic and Greek letters that render like Latin ones. */
const LATIN_LOOKALIKES = new Set([..."аеорсухіјѕӏԁԛԝһвкмнтАВЕКМНОРСТУХІЈЅοορνικτυαΑΒΕΖΗΙΚΜΝΟΡΤΥΧ"]);

function scriptsOf(label: string): Set<string> {
  const found = new Set<string>();
  for (const ch of label) {
    // Script-neutral characters (ー, digits, combining marks) don't count towards mixing.
    if (!/\p{L}/u.test(ch) || /[\p{Script=Common}\p{Script=Inherited}]/u.test(ch)) continue;
    const sc = SCRIPTS.find((s) => SCRIPT_RE[s].test(ch));
    found.add(sc ?? "Other");
  }
  return found;
}

/** Homograph checks per label of a Unicode domain. */
export function spoofingWarnings(domain: string): string[] {
  const out: string[] = [];
  for (const label of domain.split(".")) {
    const scripts = [...scriptsOf(label)];
    const nonJapanese = scripts.filter((s) => !JAPANESE.has(s));
    if (nonJapanese.length > 1 || (nonJapanese.length === 1 && scripts.length > 1 && nonJapanese[0] !== "Latin")) {
      out.push(`"${label}" mixes ${scripts.join(" and ")} letters — a common phishing trick.`);
    } else if (scripts.length === 1 && scripts[0] !== "Latin" && [...label].every((c) => !/\p{L}/u.test(c) || LATIN_LOOKALIKES.has(c))) {
      out.push(`"${label}" is entirely ${scripts[0]} letters that look like Latin ones — it can pass for "${[...label].map((c) => latinFor(c)).join("")}".`);
    }
  }
  return out;
}

const LOOKALIKE_MAP: Record<string, string> = {
  а: "a", е: "e", о: "o", р: "p", с: "c", у: "y", х: "x", і: "i", ј: "j", ѕ: "s", ӏ: "l", ԁ: "d", ԛ: "q", ԝ: "w", һ: "h", в: "b", к: "k", м: "m", н: "h", т: "t",
  ο: "o", ρ: "p", ν: "v", ι: "i", κ: "k", τ: "t", υ: "u", α: "a",
};
const latinFor = (c: string) => LOOKALIKE_MAP[c.toLowerCase()] ?? c;

/** Splits "https://user@host:8080/path", "user@host" or a bare host into [before, host, after]. */
function splitHost(input: string): [string, string, string] {
  const url = /^([a-z][a-z0-9+.-]*:\/\/(?:[^@/?#]*@)?)([^/?#:]+)(.*)$/i.exec(input);
  if (url) return [url[1]!, url[2]!, url[3]!];
  const email = /^([^@\s]+@)([^@\s]+)$/.exec(input);
  if (email) return [email[1]!, email[2]!, ""];
  const hostPort = /^([^/:]+)(:\d+(?:\/.*)?|\/.*)?$/.exec(input);
  if (hostPort) return ["", hostPort[1]!, hostPort[2] ?? ""];
  return ["", input, ""];
}

function prepare(host: string, o: Partial<PunycodeOptions>): string {
  return (o.normalize ?? true) ? host.normalize("NFKC").toLowerCase().replace(DOTS, ".") : host;
}

function encodeHost(host: string): string {
  return host
    .split(".")
    .map((label) => (isAscii(label) ? label : `xn--${encodeLabel(label)}`))
    .join(".");
}

function decodeHost(host: string): string {
  return host
    .split(".")
    .map((label) => (label.toLowerCase().startsWith("xn--") ? decodeLabel(label.slice(4)) : label))
    .join(".");
}

function lengthWarnings(ascii: string): string[] {
  const w: string[] = [];
  for (const label of ascii.split(".")) if (label.length > 63) w.push(`Label "${label.slice(0, 20)}…" is ${label.length} characters; DNS allows 63.`);
  if (ascii.length > 253) w.push(`The domain is ${ascii.length} characters; DNS allows 253.`);
  return w;
}

function convertLines(input: string, one: (line: string) => { out: string; warnings: string[] }, failMsg: string): PunycodeResult {
  const lines = input.split(/\r?\n/);
  if (lines.every((l) => !l.trim())) return { output: "", error: null };
  const out: string[] = [];
  const warnings: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i]!.trim();
    if (!t) {
      out.push("");
      continue;
    }
    try {
      const r = one(t);
      out.push(r.out);
      warnings.push(...r.warnings);
    } catch (err) {
      const msg = err instanceof Error ? err.message : failMsg;
      return { output: "", error: { message: lines.length > 1 ? `Line ${i + 1}: ${msg}` : msg } };
    }
  }
  return { output: out.join("\n"), error: null, ...(warnings.length ? { warnings } : {}) };
}

export function domainToPunycode(input: string, options: Partial<PunycodeOptions> = {}): PunycodeResult {
  if (input.trim().length === 0) return { output: "", error: null };
  return convertLines(
    input,
    (line) => {
      const [pre, host, post] = splitHost(line);
      const prepared = prepare(host, options);
      const ascii = encodeHost(prepared);
      const warnings = [...lengthWarnings(ascii), ...((options.checkSpoofing ?? true) ? spoofingWarnings(prepared) : [])];
      return { out: pre + ascii + post, warnings };
    },
    "Could not encode this domain.",
  );
}

export function domainFromPunycode(input: string, options: Partial<PunycodeOptions> = {}): PunycodeResult {
  if (input.trim().length === 0) return { output: "", error: null };
  return convertLines(
    input,
    (line) => {
      const [pre, host, post] = splitHost(line);
      const unicode = decodeHost(host);
      return { out: pre + unicode + post, warnings: (options.checkSpoofing ?? true) ? spoofingWarnings(unicode) : [] };
    },
    "This doesn't look like a valid Punycode domain.",
  );
}

export function convertPunycode(input: string, mode: PunycodeMode, options: Partial<PunycodeOptions> = {}): PunycodeResult {
  return mode === "encode" ? domainToPunycode(input, options) : domainFromPunycode(input, options);
}

import type { TransformResult } from "@/lib/tool-transform";
import type { PunycodeMode } from "./schema";

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
    output.push(input[j]);
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

export function domainToPunycode(input: string): TransformResult {
  const trimmed = input.trim();
  if (trimmed.length === 0) return { output: "", error: null };
  try {
    const output = trimmed
      .split(".")
      .map((label) => (isAscii(label) ? label : `xn--${encodeLabel(label)}`))
      .join(".");
    return { output, error: null };
  } catch (err) {
    return { output: "", error: { message: err instanceof Error ? err.message : "Could not encode this domain." } };
  }
}

export function domainFromPunycode(input: string): TransformResult {
  const trimmed = input.trim();
  if (trimmed.length === 0) return { output: "", error: null };
  try {
    const output = trimmed
      .split(".")
      .map((label) => (label.toLowerCase().startsWith("xn--") ? decodeLabel(label.slice(4)) : label))
      .join(".");
    return { output, error: null };
  } catch (err) {
    return {
      output: "",
      error: { message: err instanceof Error ? err.message : "This doesn't look like a valid Punycode domain." },
    };
  }
}

export function convertPunycode(input: string, mode: PunycodeMode): TransformResult {
  return mode === "encode" ? domainToPunycode(input) : domainFromPunycode(input);
}

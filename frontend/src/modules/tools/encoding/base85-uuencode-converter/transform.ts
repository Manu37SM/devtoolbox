import type { TransformResult } from "@/lib/tool-transform";
import type { Base85UuencodeConverterOptions } from "./schema";

const A85_FIRST = 33; // '!'
const RFC1924 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{|}~";
const Z85 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-:+=^!/*?&<>()[]{}@%$#";

const err = (message: string): TransformResult => ({ output: "", error: { message } });
const toHex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

function fromHex(s: string): Uint8Array | null {
  const clean = s.replace(/0x/gi, "").replace(/[\s,:-]/g, "");
  if (clean.length % 2 || /[^0-9a-f]/i.test(clean)) return null;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

const wrapText = (s: string, n: number) => (n > 0 ? (s.match(new RegExp(`.{1,${n}}`, "gs")) ?? [s]).join("\n") : s);

/** Shared 4-bytes → 5-digits encoder; `char(i)` maps a digit 0..84 to its character. */
function enc85(data: Uint8Array, char: (d: number) => string, zeroShortcut: boolean): string {
  let out = "";
  for (let i = 0; i < data.length; i += 4) {
    const n = Math.min(4, data.length - i);
    let v = 0;
    for (let k = 0; k < 4; k++) v = v * 256 + (k < n ? data[i + k]! : 0);
    if (zeroShortcut && n === 4 && v === 0) { out += "z"; continue; }
    const digits: string[] = [];
    for (let k = 0; k < 5; k++) { digits.unshift(char(v % 85)); v = Math.floor(v / 85); }
    out += digits.slice(0, n + 1).join("");
  }
  return out;
}

function dec85(text: string, index: (c: string) => number, pad: string, zeroShortcut: boolean): Uint8Array | string {
  const bytes: number[] = [];
  let group: number[] = [];
  const flush = (len: number) => {
    let v = 0;
    const padded = [...group];
    while (padded.length < 5) padded.push(index(pad));
    for (const d of padded) v = v * 85 + d;
    if (v > 0xffffffff) return false;
    const four = [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
    bytes.push(...four.slice(0, len));
    group = [];
    return true;
  };
  for (const c of text) {
    if (zeroShortcut && c === "z") {
      if (group.length) return '"z" can only appear between complete groups.';
      bytes.push(0, 0, 0, 0);
      continue;
    }
    const d = index(c);
    if (d < 0) return `Invalid character "${c}" for this alphabet.`;
    group.push(d);
    if (group.length === 5 && !flush(4)) return "A 5-character group is out of range (value exceeds 32 bits).";
  }
  if (group.length === 1) return "Truncated input: a final group cannot be a single character.";
  if (group.length > 1 && !flush(group.length - 1)) return "The final group is out of range.";
  return Uint8Array.from(bytes);
}

function uuencode(data: Uint8Array, name: string, mode: string, backtick: boolean): string {
  const ch = (v: number) => (v === 0 && backtick ? "`" : String.fromCharCode(32 + (v & 63)));
  const lines: string[] = [`begin ${mode} ${name}`];
  for (let i = 0; i < data.length; i += 45) {
    const chunk = data.subarray(i, i + 45);
    let line = ch(chunk.length);
    for (let k = 0; k < chunk.length; k += 3) {
      const a = chunk[k]!, b = chunk[k + 1] ?? 0, c = chunk[k + 2] ?? 0;
      line += ch(a >> 2) + ch(((a & 3) << 4) | (b >> 4)) + ch(((b & 15) << 2) | (c >> 6)) + ch(c & 63);
    }
    lines.push(line);
  }
  lines.push(ch(0), "end");
  return lines.join("\n");
}

function uudecode(text: string): Uint8Array | string {
  const bytes: number[] = [];
  let began = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, "");
    if (!began && /^begin(-base64)?\s/.test(line)) { began = true; continue; }
    if (line === "end") break;
    if (line === "" ) continue;
    const n = (line.charCodeAt(0) - 32) & 63;
    if (n === 0) continue;
    const body = line.slice(1);
    const need = Math.ceil(n / 3) * 4;
    if (body.length < need) return `A line declares ${n} bytes but is too short.`;
    const v = (i: number) => (body.charCodeAt(i) - 32) & 63;
    const out: number[] = [];
    for (let k = 0; k < need; k += 4) out.push((v(k) << 2) | (v(k + 1) >> 4), ((v(k + 1) & 15) << 4) | (v(k + 2) >> 2), ((v(k + 2) & 3) << 6) | v(k + 3));
    bytes.push(...out.slice(0, n));
  }
  return Uint8Array.from(bytes);
}

export function base85UuencodeConverter(input: string, options: Partial<Base85UuencodeConverterOptions>): TransformResult {
  const o: Base85UuencodeConverterOptions = {
    action: options.action ?? "encode", format: options.format ?? "ascii85", inputKind: options.inputKind ?? "text", outputKind: options.outputKind ?? "text",
    wrap: options.wrap ?? 0, fileName: options.fileName ?? "data.bin", fileMode: options.fileMode ?? "644", backtick: options.backtick ?? true,
  };
  if (o.action === "encode") {
    if (input === "") return { output: "", error: null };
    let data: Uint8Array;
    if (o.inputKind === "hex") {
      const h = fromHex(input);
      if (!h) return err("Hex input must contain an even number of hex digits.");
      data = h;
    } else data = new TextEncoder().encode(input);
    if (o.format === "uuencode") {
      if (!/^[0-7]{3,4}$/.test(o.fileMode)) return err("File mode must be octal, e.g. 644.");
      if (!/^[^\s]+$/.test(o.fileName)) return err("File name must not contain spaces.");
      return { output: uuencode(data, o.fileName, o.fileMode, o.backtick), error: null };
    }
    if (o.format === "z85") {
      if (data.length % 4) return err(`Z85 encodes whole 4-byte blocks; this input is ${data.length} bytes. Pad it to a multiple of 4.`);
      return { output: wrapText(enc85(data, (d) => Z85[d]!, false), o.wrap), error: null };
    }
    if (o.format === "rfc1924") return { output: wrapText(enc85(data, (d) => RFC1924[d]!, false), o.wrap), error: null };
    const body = enc85(data, (d) => String.fromCharCode(A85_FIRST + d), true);
    return { output: o.format === "adobe" ? `<~${wrapText(body, o.wrap)}~>` : wrapText(body, o.wrap), error: null };
  }

  if (input.trim() === "") return { output: "", error: null };
  let bytes: Uint8Array | string;
  if (o.format === "uuencode") bytes = uudecode(input);
  else {
    let t = input.replace(/\s+/g, "");
    if (o.format === "adobe" || o.format === "ascii85") t = t.replace(/^<~/, "").replace(/~>$/, "");
    if (o.format === "rfc1924") bytes = dec85(t, (c) => RFC1924.indexOf(c), RFC1924[84]!, false);
    else if (o.format === "z85") {
      const r = dec85(t, (c) => Z85.indexOf(c), Z85[84]!, false);
      bytes = typeof r !== "string" && t.length % 5 ? "Z85 input length must be a multiple of 5 characters." : r;
    } else bytes = dec85(t, (c) => (c >= "!" && c <= "u" ? c.charCodeAt(0) - A85_FIRST : -1), "u", true);
  }
  if (typeof bytes === "string") return err(bytes);
  if (o.outputKind === "hex") return { output: toHex(bytes), error: null };
  try {
    return { output: new TextDecoder("utf-8", { fatal: true }).decode(bytes), error: null };
  } catch {
    return err(`The ${bytes.length} decoded bytes are not valid UTF-8 text. Switch the output to hex.`);
  }
}

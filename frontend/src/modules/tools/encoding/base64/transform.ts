import type { Base64Options } from "./schema";
import type { TransformResult } from "@/lib/tool-transform";
import { looksBinary } from "@/lib/tool-io";

export function transformBase64(input: string, options: Base64Options): TransformResult {
  if (input.length === 0) return { output: "", error: null };

  try {
    const output = options.mode === "encode" ? encode(input, options) : decode(input, options);
    return { output, error: null };
  } catch (err) {
    return {
      output: "",
      error: { message: err instanceof Error ? err.message : "Invalid Base64 input" },
    };
  }
}

const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const BASE64_URL_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function hexToBytes(input: string): Uint8Array {
  const hex = input.replace(/^0x/i, "").replace(/[\s:,-]|\\x|0x/gi, "");
  if (!/^[0-9a-fA-F]*$/.test(hex)) throw new Error("Hex input may only contain 0-9, a-f and separators");
  if (hex.length % 2) throw new Error(`Hex input has an odd number of digits (${hex.length})`);
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function encode(input: string, o: Base64Options): string {
  const bytes = o.inputFormat === "hex" ? hexToBytes(input) : new TextEncoder().encode(input);
  const chars = o.urlSafe ? BASE64_URL_CHARS : BASE64_CHARS;
  const pad = o.padding === "always" || (o.padding !== "never" && !o.urlSafe);
  let output = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]!;
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    output += chars[b0 >> 2];
    output += chars[((b0 & 0x03) << 4) | ((b1 ?? 0) >> 4)];
    output += b1 === undefined ? (pad ? "=" : "") : chars[((b1 & 0x0f) << 2) | ((b2 ?? 0) >> 6)];
    output += b2 === undefined ? (pad ? "=" : "") : chars[b2 & 0x3f];
  }
  const width = o.lineLength ?? 0;
  return width > 0 ? (output.match(new RegExp(`.{1,${width}}`, "g")) ?? []).join("\n") : output;
}

/** Accepts both alphabets, missing padding, whitespace and line breaks. */
function decode(input: string, o: Base64Options): string {
  const clean = input.replace(/[\r\n\s]/g, "").replace(/=+$/, "");
  const lookup = new Map<string, number>();
  BASE64_CHARS.split("").forEach((c, i) => lookup.set(c, i));
  lookup.set("-", 62);
  lookup.set("_", 63);

  if (clean.length % 4 === 1) throw new Error("Invalid Base64 length: one character too many or too few");
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < clean.length; i++) {
    const char = clean[i]!;
    const value = lookup.get(char);
    if (value === undefined) {
      throw new Error(`Invalid Base64 character "${char}" at position ${i + 1}`);
    }
    buffer = ((buffer << 6) | value) & 0xffffff;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  const data = new Uint8Array(bytes);
  const asHex = () => Array.from(data, (b) => b.toString(16).padStart(2, "0")).join(" ");
  if (o.decodeAs === "hex") return asHex();
  if (o.decodeAs === "text") return new TextDecoder().decode(data);
  // NUL bytes, many control characters or invalid UTF-8 mean binary: show hex rather than garbage.
  return looksBinary(data) ? asHex() : new TextDecoder().decode(data);
}

import type { Base64Options } from "./schema";
import type { TransformResult } from "@/lib/tool-transform";

export function transformBase64(input: string, options: Base64Options): TransformResult {
  if (input.length === 0) return { output: "", error: null };

  try {
    const output =
      options.mode === "encode" ? encodeBase64(input, options.urlSafe) : decodeBase64(input, options.urlSafe);
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

function encodeBase64(input: string, urlSafe: boolean): string {
  const bytes = new TextEncoder().encode(input);
  const chars = urlSafe ? BASE64_URL_CHARS : BASE64_CHARS;
  let output = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]!;
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    output += chars[b0 >> 2];
    output += chars[((b0 & 0x03) << 4) | ((b1 ?? 0) >> 4)];
    output += b1 === undefined ? (urlSafe ? "" : "=") : chars[((b1 & 0x0f) << 2) | ((b2 ?? 0) >> 6)];
    output += b2 === undefined ? (urlSafe ? "" : "=") : chars[b2 & 0x3f];
  }
  return output;
}

function decodeBase64(input: string, urlSafe: boolean): string {
  const chars = urlSafe ? BASE64_URL_CHARS : BASE64_CHARS;
  const clean = input.replace(/[\r\n\s]/g, "").replace(/=+$/, "");
  const lookup = new Map(chars.split("").map((c, i) => [c, i]));

  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of clean) {
    const value = lookup.get(char);
    if (value === undefined) {
      throw new Error(`Invalid Base64 character: "${char}"`);
    }
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}

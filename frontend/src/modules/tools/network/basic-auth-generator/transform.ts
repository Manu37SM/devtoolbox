import type { TransformResult } from "@/lib/tool-transform";
import type { BasicAuthGeneratorOptions } from "./schema";

export function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export function base64ToUtf8(b64: string): string {
  const cleaned = b64.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = cleaned + "=".repeat((4 - (cleaned.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export function convertBasicAuth(input: string, options: BasicAuthGeneratorOptions): TransformResult {
  const text = input.trim();
  if (text.length === 0) return { output: "", error: null };

  if (options.mode === "encode") {
    if (!text.includes(":")) {
      return { output: "", error: { message: 'Enter credentials as "username:password" (the username itself can\'t contain a colon).' } };
    }
    const b64 = utf8ToBase64(text);
    switch (options.format) {
      case "header": return { output: `Authorization: Basic ${b64}`, error: null };
      case "value": return { output: `Basic ${b64}`, error: null };
      case "base64": return { output: b64, error: null };
      case "curl": return { output: `curl -H "Authorization: Basic ${b64}" https://example.com/api`, error: null };
    }
  }

  const b64 = text.replace(/^authorization\s*:\s*/i, "").replace(/^basic\s+/i, "");
  try {
    const decoded = base64ToUtf8(b64);
    const colon = decoded.indexOf(":");
    if (colon === -1) return { output: "", error: { message: "Decoded value has no colon — it isn't username:password." } };
    return { output: `username: ${decoded.slice(0, colon)}\npassword: ${decoded.slice(colon + 1)}`, error: null };
  } catch {
    return { output: "", error: { message: "Not valid Base64 (or the decoded bytes aren't UTF-8 text)." } };
  }
}

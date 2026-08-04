import type { HmacGeneratorOptions } from "./schema";

export interface HmacResult {
  output: string;
  error: { message: string } | null;
}

const SUBTLE_HASH_NAME: Record<HmacGeneratorOptions["algorithm"], string> = {
  "SHA-1": "SHA-1",
  "SHA-256": "SHA-256",
  "SHA-384": "SHA-384",
  "SHA-512": "SHA-512",
};

/** HMAC generation via WebCrypto's SubtleCrypto, which is inherently async.
 * Works identically in the browser, Node (Vitest), and a Worker since
 * `crypto.subtle` is available in all three. */
export async function generateHmac(
  message: string,
  secret: string,
  options: HmacGeneratorOptions,
): Promise<HmacResult> {
  if (message.length === 0) return { output: "", error: null };
  if (secret.length === 0) {
    return { output: "", error: { message: "Secret key is required." } };
  }

  try {
    const keyData = new TextEncoder().encode(secret);
    const key = await crypto.subtle.importKey(
      "raw",
      keyData as BufferSource,
      { name: "HMAC", hash: SUBTLE_HASH_NAME[options.algorithm] },
      false,
      ["sign"],
    );
    const messageData = new TextEncoder().encode(message);
    const signature = await crypto.subtle.sign("HMAC", key, messageData as BufferSource);
    const bytes = new Uint8Array(signature);
    const output = options.outputFormat === "hex" ? bytesToHex(bytes) : bytesToBase64(bytes);
    return { output, error: null };
  } catch (err) {
    return { output: "", error: { message: err instanceof Error ? err.message : "HMAC generation failed" } };
  }
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  if (typeof btoa === "function") return btoa(binary);
  return Buffer.from(bytes).toString("base64");
}

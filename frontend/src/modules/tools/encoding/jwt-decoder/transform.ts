export interface JwtDecodeResult {
  header: Record<string, unknown> | null;
  payload: Record<string, unknown> | null;
  signature: string | null;
  isExpired: boolean | null;
  expiresAt: string | null;
  issuedAt: string | null;
  error: string | null;
}

/** Pure JWT decode (no signature verification — that's a separate,
 * explicitly opt-in step per FEATURE.md). Decodes header/payload only. */
export function decodeJwt(input: string): JwtDecodeResult {
  const empty: JwtDecodeResult = {
    header: null,
    payload: null,
    signature: null,
    isExpired: null,
    expiresAt: null,
    issuedAt: null,
    error: null,
  };

  const trimmed = input.trim();
  if (trimmed.length === 0) return empty;

  const parts = trimmed.split(".");
  if (parts.length !== 3) {
    return { ...empty, error: "A JWT must have exactly three dot-separated parts (header.payload.signature)." };
  }

  const [headerPart, payloadPart, signaturePart] = parts;

  let header: Record<string, unknown>;
  let payload: Record<string, unknown>;
  try {
    header = JSON.parse(base64UrlDecode(headerPart!));
  } catch {
    return { ...empty, error: "Could not decode/parse the JWT header segment." };
  }
  try {
    payload = JSON.parse(base64UrlDecode(payloadPart!));
  } catch {
    return { ...empty, error: "Could not decode/parse the JWT payload segment." };
  }

  const exp = typeof payload.exp === "number" ? payload.exp : null;
  const iat = typeof payload.iat === "number" ? payload.iat : null;

  return {
    header,
    payload,
    signature: signaturePart ?? null,
    isExpired: exp === null ? null : exp * 1000 < Date.now(),
    expiresAt: exp === null ? null : new Date(exp * 1000).toISOString(),
    issuedAt: iat === null ? null : new Date(iat * 1000).toISOString(),
    error: null,
  };
}

function base64UrlDecode(segment: string): string {
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atobPolyfill(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

// Manual base64 decode so this stays DOM-free (works outside a browser,
// e.g. in Vitest/SSR) rather than depending on global atob.
function atobPolyfill(input: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const clean = input.replace(/=+$/, "");
  const lookup = new Map(chars.split("").map((c, i) => [c, i]));
  let output = "";
  let buffer = 0;
  let bits = 0;
  for (const char of clean) {
    const value = lookup.get(char);
    if (value === undefined) throw new Error(`Invalid Base64 character: "${char}"`);
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return output;
}

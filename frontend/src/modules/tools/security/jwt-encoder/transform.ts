import type { TransformResult } from "@/lib/tool-transform";
import type { JwtEncoderOptions } from "./schema";

const HASH: Record<JwtEncoderOptions["algorithm"], string> = { HS256: "SHA-256", HS384: "SHA-384", HS512: "SHA-512" };
const TTL_SECONDS: Record<JwtEncoderOptions["expiresIn"], number> = { none: 0, "15m": 900, "1h": 3600, "24h": 86_400, "7d": 604_800, "30d": 2_592_000 };

export function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const encodeJson = (value: unknown) => base64Url(new TextEncoder().encode(JSON.stringify(value)));

export async function encodeJwt(
  input: string,
  options: JwtEncoderOptions,
  _nonce = 0,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Promise<TransformResult> {
  if (input.trim().length === 0) return { output: "", error: null };
  let payload: unknown;
  try {
    payload = JSON.parse(input);
  } catch (e) {
    return { output: "", error: { message: `Payload is not valid JSON: ${e instanceof Error ? e.message : String(e)}` } };
  }
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return { output: "", error: { message: "The JWT payload must be a JSON object." } };
  }
  if (options.secret.length === 0) return { output: "", error: { message: "Enter a signing secret." } };

  const claims: Record<string, unknown> = { ...(payload as Record<string, unknown>) };
  if (options.addIssuedAt && claims.iat === undefined) claims.iat = nowSeconds;
  if (options.expiresIn !== "none" && claims.exp === undefined) claims.exp = (typeof claims.iat === "number" ? claims.iat : nowSeconds) + TTL_SECONDS[options.expiresIn];

  const header: Record<string, string> = { alg: options.algorithm, typ: "JWT" };
  if (options.keyId.trim()) header.kid = options.keyId.trim();

  try {
    const signingInput = `${encodeJson(header)}.${encodeJson(claims)}`;
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(options.secret) as BufferSource, { name: "HMAC", hash: HASH[options.algorithm] }, false, ["sign"]);
    const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signingInput) as BufferSource);
    return { output: `${signingInput}.${base64Url(new Uint8Array(signature))}`, error: null };
  } catch (e) {
    return { output: "", error: { message: e instanceof Error ? e.message : "Signing failed." } };
  }
}

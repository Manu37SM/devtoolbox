import * as jsrsasign from "jsrsasign";
import type { JwtDecoderOptions } from "./schema";

export interface JwtDecodeResult {
  header: Record<string, unknown> | null;
  payload: Record<string, unknown> | null;
  signature: string | null;
  isExpired: boolean | null;
  expiresAt: string | null;
  issuedAt: string | null;
  /** Claim checks: expiry, not-before, issuer, audience, algorithm. */
  checks?: JwtCheck[];
  /** Signature verification outcome, when a secret or key is supplied. */
  verification?: { status: "valid" | "invalid" | "error"; detail: string };
  /** Set for encrypted tokens (JWE, five parts) whose payload can't be read. */
  encrypted?: boolean;
  error: string | null;
}

export interface JwtCheck {
  label: string;
  status: "pass" | "fail" | "warn" | "info";
  detail: string;
}

export function decodeJwt(input: string, options: Partial<JwtDecoderOptions> = {}, nowMs: number = Date.now()): JwtDecodeResult {
  const empty: JwtDecodeResult = {
    header: null,
    payload: null,
    signature: null,
    isExpired: null,
    expiresAt: null,
    issuedAt: null,
    error: null,
  };

  // Accept a pasted "Authorization: Bearer <token>" header too.
  const trimmed = input.trim().replace(/^(authorization:\s*)?bearer\s+/i, "");
  if (trimmed.length === 0) return empty;

  const parts = trimmed.split(".");
  if (parts.length === 5) {
    try {
      const header = JSON.parse(base64UrlDecode(parts[0]!)) as Record<string, unknown>;
      return {
        ...empty,
        header,
        encrypted: true,
        checks: [{ label: "Encrypted", status: "info", detail: `JWE (${String(header.alg)} / ${String(header.enc)}): the payload is encrypted and can't be read without the recipient's key.` }],
      };
    } catch {
      return { ...empty, error: "Five parts suggests an encrypted JWE, but its header could not be decoded." };
    }
  }
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

  const checks = claimChecks(header, payload, options, nowMs);
  const verification = verify(trimmed, header, options);
  return {
    header,
    payload,
    signature: signaturePart ?? null,
    checks,
    ...(verification ? { verification } : {}),
    isExpired: exp === null ? null : exp * 1000 < nowMs,
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

const iso = (sec: number) => new Date(sec * 1000).toISOString();

function claimChecks(header: Record<string, unknown>, p: Record<string, unknown>, o: Partial<JwtDecoderOptions>, nowMs: number): JwtCheck[] {
  const now = nowMs / 1000;
  const leeway = o.leewaySeconds ?? 0;
  const out: JwtCheck[] = [];
  const alg = String(header.alg ?? "");
  if (alg.toLowerCase() === "none") out.push({ label: "Algorithm", status: "fail", detail: 'alg "none" means the token is unsigned — never accept it.' });
  else out.push({ label: "Algorithm", status: "info", detail: alg || "missing" });

  if (typeof p.exp === "number") {
    const left = p.exp - now;
    out.push(
      left + leeway < 0
        ? { label: "Expiry (exp)", status: "fail", detail: `Expired at ${iso(p.exp)} (${fmtDuration(-left)} ago).` }
        : { label: "Expiry (exp)", status: "pass", detail: `Expires at ${iso(p.exp)} (in ${fmtDuration(left)}).` },
    );
  } else out.push({ label: "Expiry (exp)", status: "warn", detail: "No exp claim — the token never expires." });

  if (typeof p.nbf === "number") {
    out.push(
      p.nbf - leeway > now
        ? { label: "Not before (nbf)", status: "fail", detail: `Not valid until ${iso(p.nbf)}.` }
        : { label: "Not before (nbf)", status: "pass", detail: `Valid since ${iso(p.nbf)}.` },
    );
  }
  if (typeof p.iat === "number" && p.iat - leeway > now) {
    out.push({ label: "Issued at (iat)", status: "warn", detail: `Issued in the future (${iso(p.iat)}) — check clock skew.` });
  }
  if (typeof p.exp === "number" && typeof p.iat === "number") {
    out.push({ label: "Lifetime", status: "info", detail: fmtDuration(p.exp - p.iat) });
  }
  if (o.expectedIssuer) {
    out.push(
      p.iss === o.expectedIssuer
        ? { label: "Issuer (iss)", status: "pass", detail: String(p.iss) }
        : { label: "Issuer (iss)", status: "fail", detail: `Expected "${o.expectedIssuer}", got ${JSON.stringify(p.iss ?? null)}.` },
    );
  }
  if (o.expectedAudience) {
    const aud = p.aud;
    const ok = Array.isArray(aud) ? aud.includes(o.expectedAudience) : aud === o.expectedAudience;
    out.push(
      ok
        ? { label: "Audience (aud)", status: "pass", detail: o.expectedAudience }
        : { label: "Audience (aud)", status: "fail", detail: `Expected "${o.expectedAudience}", got ${JSON.stringify(aud ?? null)}.` },
    );
  }
  return out;
}

function fmtDuration(sec: number): string {
  const s = Math.round(Math.abs(sec));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const parts = [d && `${d}d`, h && `${h}h`, m && `${m}m`, !d && !h && `${s % 60}s`].filter(Boolean);
  return parts.join(" ") || "0s";
}

const HMAC_ALGS = ["HS256", "HS384", "HS512"];
const ASYM_ALGS = ["RS256", "RS384", "RS512", "PS256", "PS384", "PS512", "ES256", "ES384", "ES512"];

/**
 * Verifies with jsrsasign. The accepted algorithms come from the kind of key supplied, not the
 * token header, so an RS256 public key can never be used as an HS256 secret (algorithm confusion).
 */
function verify(token: string, header: Record<string, unknown>, o: Partial<JwtDecoderOptions>): JwtDecodeResult["verification"] | undefined {
  const alg = String(header.alg ?? "");
  const secret = o.verifySecret ?? "";
  const pub = (o.publicKey ?? "").trim();
  try {
    if (HMAC_ALGS.includes(alg)) {
      if (!secret) return undefined;
      const enc = o.secretEncoding ?? "utf8";
      const key =
        enc === "utf8" ? { utf8: secret } : enc === "hex" ? { hex: secret.trim() } : enc === "base64" ? { b64: secret.trim() } : { b64u: secret.trim() };
      const ok = jsrsasign.KJUR.jws.JWS.verify(token, key as unknown as string, HMAC_ALGS);
      return ok
        ? { status: "valid", detail: `${alg} signature matches the secret.` }
        : { status: "invalid", detail: `${alg} signature does not match — wrong secret or secret encoding, or the token was altered.` };
    }
    if (ASYM_ALGS.includes(alg)) {
      if (!pub) return undefined;
      const key = loadPublicKey(pub, header.kid);
      const ok = jsrsasign.KJUR.jws.JWS.verify(token, key, ASYM_ALGS);
      return ok
        ? { status: "valid", detail: `${alg} signature verified with the public key.` }
        : { status: "invalid", detail: `${alg} signature does not verify with this public key.` };
    }
    if (secret || pub) return { status: "error", detail: `Can't verify alg "${alg}".` };
    return undefined;
  } catch (e) {
    return { status: "error", detail: e instanceof Error ? e.message : String(e) };
  }
}

type PublicKey = Parameters<typeof jsrsasign.KJUR.jws.JWS.verify>[1];

function loadPublicKey(text: string, kid: unknown): PublicKey {
  if (text.startsWith("{")) {
    const json = JSON.parse(text) as { keys?: Record<string, unknown>[] } & Record<string, unknown>;
    let jwk: Record<string, unknown> | undefined = json;
    if (Array.isArray(json.keys)) {
      jwk = (kid ? json.keys.find((k) => k.kid === kid) : undefined) ?? (json.keys.length === 1 ? json.keys[0] : undefined);
      if (!jwk) throw new Error(kid ? `No key with kid "${String(kid)}" in the JWKS.` : "The token has no kid and the JWKS has several keys.");
    }
    if (jwk.d !== undefined) throw new Error("That JWK contains a private key (d) — paste only the public key.");
    return jsrsasign.KEYUTIL.getKey(jwk as unknown as jsrsasign.RSAKey) as PublicKey;
  }
  if (/PRIVATE KEY/.test(text)) throw new Error("That's a private key — paste the public key or certificate instead.");
  return jsrsasign.KEYUTIL.getKey(text) as PublicKey;
}

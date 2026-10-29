import type { TransformResult } from "@/lib/tool-transform";
import { base64ToBytes, bytesToBase64 } from "@/lib/byte-input";
import type { JwksInspectorOptions } from "./schema";

type Jwk = Record<string, unknown>;
const b64u = (b: Uint8Array) => bytesToBase64(b).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64u = (s: unknown) => base64ToBytes(String(s ?? ""));

const REQUIRED: Record<string, string[]> = { RSA: ["e", "kty", "n"], EC: ["crv", "kty", "x", "y"], OKP: ["crv", "kty", "x"], oct: ["k", "kty"] };
const PRIVATE = ["d", "p", "q", "dp", "dq", "qi", "oth"];
const CURVES: Record<string, { oid: string; size: number }> = { "P-256": { oid: "1.2.840.10045.3.1.7", size: 32 }, "P-384": { oid: "1.3.132.0.34", size: 48 }, "P-521": { oid: "1.3.132.0.35", size: 66 } };
const OKP: Record<string, string> = { Ed25519: "1.3.101.112", Ed448: "1.3.101.113", X25519: "1.3.101.110", X448: "1.3.101.111" };
const ALG_KTY: Record<string, string> = { RS256: "RSA", RS384: "RSA", RS512: "RSA", PS256: "RSA", PS384: "RSA", PS512: "RSA", "RSA-OAEP": "RSA", "RSA-OAEP-256": "RSA", ES256: "EC", ES384: "EC", ES512: "EC", EdDSA: "OKP", HS256: "oct", HS384: "oct", HS512: "oct" };
const ALG_CRV: Record<string, string> = { ES256: "P-256", ES384: "P-384", ES512: "P-521" };

/** RFC 7638 JWK thumbprint (SHA-256, base64url). */
export async function thumbprint(jwk: Jwk): Promise<string> {
  const req = REQUIRED[String(jwk.kty)];
  if (!req) throw new Error(`Unsupported kty "${String(jwk.kty)}"`);
  const canon = `{${req.map((k) => `${JSON.stringify(k)}:${JSON.stringify(jwk[k])}`).join(",")}}`;
  return b64u(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canon))));
}

// ---- minimal DER writer / reader ----
const len = (n: number) => (n < 128 ? [n] : n < 256 ? [0x81, n] : [0x82, n >> 8, n & 255]);
const tlv = (tag: number, body: number[]) => [tag, ...len(body.length), ...body];
const int = (b: Uint8Array) => { let x = [...b]; while (x.length > 1 && x[0] === 0) x = x.slice(1); if (x[0]! & 0x80) x = [0, ...x]; return tlv(0x02, x); };
function oid(s: string): number[] {
  const p = s.split(".").map(Number);
  const body = [p[0]! * 40 + p[1]!];
  for (const n of p.slice(2)) { const enc = [n & 0x7f]; let v = Math.floor(n / 128); while (v) { enc.unshift((v & 0x7f) | 0x80); v = Math.floor(v / 128); } body.push(...enc); }
  return tlv(0x06, body);
}
const seq = (...items: number[][]) => tlv(0x30, items.flat());
const bitString = (b: number[]) => tlv(0x03, [0, ...b]);

export function jwkToSpki(jwk: Jwk): Uint8Array {
  const kty = String(jwk.kty);
  if (kty === "RSA") return Uint8Array.from(seq(seq(oid("1.2.840.113549.1.1.1"), [0x05, 0x00]), bitString(seq(int(fromB64u(jwk.n)), int(fromB64u(jwk.e))))));
  if (kty === "EC") {
    const c = CURVES[String(jwk.crv)];
    if (!c) throw new Error(`Unsupported curve "${String(jwk.crv)}"`);
    const x = fromB64u(jwk.x), y = fromB64u(jwk.y);
    if (x.length !== c.size || y.length !== c.size) throw new Error(`${String(jwk.crv)} coordinates must be ${c.size} bytes`);
    return Uint8Array.from(seq(seq(oid("1.2.840.10045.2.1"), oid(c.oid)), bitString([0x04, ...x, ...y])));
  }
  if (kty === "OKP") {
    const o = OKP[String(jwk.crv)];
    if (!o) throw new Error(`Unsupported OKP curve "${String(jwk.crv)}"`);
    return Uint8Array.from(seq(seq(oid(o)), bitString([...fromB64u(jwk.x)])));
  }
  throw new Error(`No public key form for kty "${kty}"`);
}

export const toPem = (der: Uint8Array, label = "PUBLIC KEY") => `-----BEGIN ${label}-----\n${bytesToBase64(der).match(/.{1,64}/g)!.join("\n")}\n-----END ${label}-----`;

class Der {
  p = 0;
  constructor(private b: Uint8Array) {}
  read(expect?: number): { tag: number; body: Uint8Array } {
    const tag = this.b[this.p++]!;
    if (expect !== undefined && tag !== expect) throw new Error(`Unexpected DER tag 0x${tag.toString(16)} (wanted 0x${expect.toString(16)})`);
    let l = this.b[this.p++]!;
    if (l & 0x80) { const n = l & 0x7f; l = 0; for (let i = 0; i < n; i++) l = l * 256 + this.b[this.p++]!; }
    const body = this.b.subarray(this.p, this.p + l);
    if (body.length !== l) throw new Error("Truncated DER");
    this.p += l;
    return { tag, body };
  }
}
function oidString(b: Uint8Array): string { const parts = [Math.floor(b[0]! / 40), b[0]! % 40]; let v = 0; for (const x of b.subarray(1)) { v = v * 128 + (x & 0x7f); if (!(x & 0x80)) { parts.push(v); v = 0; } } return parts.join("."); }
const strip = (b: Uint8Array) => { let i = 0; while (i < b.length - 1 && b[i] === 0) i++; return b.subarray(i); };

export function spkiToJwk(der: Uint8Array): Jwk {
  const outer = new Der(new Der(der).read(0x30).body);
  const alg = new Der(outer.read(0x30).body);
  const algOid = oidString(alg.read(0x06).body);
  const key = outer.read(0x03).body.subarray(1);
  if (algOid === "1.2.840.113549.1.1.1") {
    const rsa = new Der(new Der(key).read(0x30).body);
    return { kty: "RSA", n: b64u(strip(rsa.read(0x02).body)), e: b64u(strip(rsa.read(0x02).body)) };
  }
  if (algOid === "1.2.840.10045.2.1") {
    const curveOid = oidString(alg.read(0x06).body);
    const crv = Object.entries(CURVES).find(([, c]) => c.oid === curveOid);
    if (!crv) throw new Error(`Unsupported EC curve ${curveOid}`);
    if (key[0] !== 0x04) throw new Error("Compressed EC points are not supported");
    const size = crv[1].size;
    return { kty: "EC", crv: crv[0], x: b64u(key.subarray(1, 1 + size)), y: b64u(key.subarray(1 + size, 1 + 2 * size)) };
  }
  const okp = Object.entries(OKP).find(([, o]) => o === algOid);
  if (okp) return { kty: "OKP", crv: okp[0], x: b64u(key) };
  throw new Error(`Unsupported key algorithm ${algOid}`);
}

function keySize(jwk: Jwk): string {
  if (jwk.kty === "RSA") return `${strip(fromB64u(jwk.n)).length * 8 - Math.clz32(strip(fromB64u(jwk.n))[0]!) + 24} bits`;
  if (jwk.kty === "EC" || jwk.kty === "OKP") return String(jwk.crv);
  if (jwk.kty === "oct") return `${fromB64u(jwk.k).length * 8} bits`;
  return "?";
}

export async function inspectKey(jwk: Jwk): Promise<{ lines: string[]; warnings: string[]; thumb: string | null }> {
  const warnings: string[] = [];
  const kty = String(jwk.kty ?? "");
  if (!REQUIRED[kty]) return { lines: [`kty: ${kty || "(missing)"}`], warnings: [`Unsupported or missing kty "${kty}".`], thumb: null };
  const missing = REQUIRED[kty]!.filter((k) => jwk[k] === undefined);
  if (missing.length) return { lines: [`kty: ${kty}`], warnings: [`Missing required member${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}.`], thumb: null };
  const thumb = await thumbprint(jwk);
  const priv = PRIVATE.filter((k) => k in jwk);
  if (priv.length || kty === "oct") warnings.push(`Contains ${kty === "oct" ? "a symmetric secret (k)" : `private key members (${priv.join(", ")})`}: never publish this in a JWKS endpoint.`);
  if (!jwk.kid) warnings.push("No kid: verifiers cannot pick this key during rotation. The thumbprint is a good kid.");
  if (kty === "RSA") {
    const bits = Number(keySize(jwk).split(" ")[0]);
    if (bits < 2048) warnings.push(`RSA key is ${bits} bits; use at least 2048.`);
    if (jwk.e !== "AQAB") warnings.push(`Unusual RSA public exponent (${String(jwk.e)}); 65537 (AQAB) is standard.`);
  }
  if (typeof jwk.alg === "string") {
    if (ALG_KTY[jwk.alg] && ALG_KTY[jwk.alg] !== kty) warnings.push(`alg ${jwk.alg} needs kty ${ALG_KTY[jwk.alg]}, not ${kty}.`);
    if (ALG_CRV[jwk.alg] && jwk.crv !== ALG_CRV[jwk.alg]) warnings.push(`alg ${jwk.alg} needs curve ${ALG_CRV[jwk.alg]}, not ${String(jwk.crv)}.`);
    if (jwk.alg === "none" || /^HS/.test(jwk.alg) && kty !== "oct") warnings.push(`alg ${jwk.alg} does not belong on a public key.`);
  }
  const lines = [
    `kid: ${String(jwk.kid ?? "(none)")}`,
    `kty: ${kty}, ${jwk.crv ? `curve ${String(jwk.crv)}` : keySize(jwk)}`,
    `use: ${String(jwk.use ?? "-")}, alg: ${String(jwk.alg ?? "-")}${Array.isArray(jwk.key_ops) ? `, key_ops: ${jwk.key_ops.join(", ")}` : ""}`,
    `RFC 7638 thumbprint (SHA-256): ${thumb}`,
  ];
  if (Array.isArray(jwk.x5c)) lines.push(`x5c: ${jwk.x5c.length} certificate${jwk.x5c.length === 1 ? "" : "s"}${jwk["x5t#S256"] ? `, x5t#S256 ${String(jwk["x5t#S256"])}` : ""}`);
  return { lines, warnings, thumb };
}

export async function runJwksInspector(input: string, options: JwksInspectorOptions): Promise<TransformResult> {
  const text = input.trim();
  if (!text) return { output: "", error: null };
  try {
    if (/-----BEGIN (RSA )?PUBLIC KEY-----/.test(text)) {
      if (/BEGIN RSA PUBLIC KEY/.test(text)) return { output: "", error: { message: "PKCS#1 \"RSA PUBLIC KEY\" is not supported; convert it with: openssl rsa -RSAPublicKey_in -in key.pem -pubout" } };
      const der = base64ToBytes(/-----BEGIN PUBLIC KEY-----([\s\S]*?)-----END PUBLIC KEY-----/.exec(text)![1]!);
      const jwk = spkiToJwk(der);
      const kid = await thumbprint(jwk);
      const full = { ...jwk, kid, use: "sig", ...(jwk.kty === "RSA" ? { alg: "RS256" } : jwk.kty === "EC" ? { alg: ({ "P-256": "ES256", "P-384": "ES384", "P-521": "ES512" } as Record<string, string>)[String(jwk.crv)] } : jwk.crv === "Ed25519" ? { alg: "EdDSA" } : {}) };
      return { output: `${JSON.stringify({ keys: [full] }, null, 2)}\n\nkid is the RFC 7638 thumbprint; alg/use are typical defaults, adjust them to your setup.`, error: null };
    }
    if (/-----BEGIN (RSA |EC |ENCRYPTED )?PRIVATE KEY-----/.test(text)) return { output: "", error: { message: "That is a PRIVATE key. Only paste public keys here, and rotate this key if it was shared anywhere." } };
    const doc = JSON.parse(text) as unknown;
    const keys: Jwk[] = Array.isArray((doc as { keys?: unknown }).keys) ? ((doc as { keys: Jwk[] }).keys) : typeof doc === "object" && doc !== null && "kty" in doc ? [doc as Jwk] : [];
    if (!keys.length) return { output: "", error: { message: "Expected a JWKS ({\"keys\": [...]}), a single JWK, or a PEM public key." } };
    if (options.output === "pem") {
      const out = await Promise.all(keys.map(async (k, i) => { try { return `# kid: ${String(k.kid ?? `#${i + 1}`)}\n${toPem(jwkToSpki(k))}`; } catch (e) { return `# kid: ${String(k.kid ?? `#${i + 1}`)}\n# ${(e as Error).message}`; } }));
      return { output: out.join("\n\n"), error: null };
    }
    if (options.output === "jwks") {
      const pub = await Promise.all(keys.map(async (k) => { const p = Object.fromEntries(Object.entries(k).filter(([key]) => !PRIVATE.includes(key))); if (!p.kid && REQUIRED[String(p.kty)]) p.kid = await thumbprint(p); return p; }));
      const symmetric = pub.filter((k) => k.kty === "oct").length;
      return { output: `${JSON.stringify({ keys: pub.filter((k) => k.kty !== "oct") }, null, 2)}${symmetric ? `\n\n${symmetric} symmetric (oct) key${symmetric > 1 ? "s were" : " was"} dropped: secrets never belong in a public JWKS.` : ""}`, error: null };
    }
    const blocks: string[] = [];
    const kids = new Map<string, number>();
    for (const [i, k] of keys.entries()) {
      const r = await inspectKey(k);
      if (typeof k.kid === "string") kids.set(k.kid, (kids.get(k.kid) ?? 0) + 1);
      blocks.push([`Key ${i + 1}`, ...r.lines.map((l) => `  ${l}`), ...r.warnings.map((w) => `  ! ${w}`)].join("\n"));
    }
    const dup = [...kids].filter(([, n]) => n > 1).map(([k]) => k);
    if (dup.length) blocks.push(`! Duplicate kid values: ${dup.join(", ")}. Verifiers may pick the wrong key.`);
    return { output: blocks.join("\n\n"), error: null };
  } catch (e) {
    return { output: "", error: { message: (e as Error).message } };
  }
}

import * as jsrsasign from "jsrsasign";
import type { RsaEcKeyPairOptions } from "./schema";

export interface KeyPairPemResult {
  publicKeyPem: string;
  privateKeyPem: string;
  /** SHA-256 fingerprint as OpenSSH prints it (SHA256:base64). */
  fingerprint?: string;
  /** RFC 7638 JWK thumbprint, used as the kid. */
  kid?: string;
  /** Explains a format that doesn't apply to this key type. */
  note?: string;
  error: string | null;
}

type Opts = Partial<RsaEcKeyPairOptions> & Pick<RsaEcKeyPairOptions, "keyType">;

export function derToPem(der: ArrayBuffer | Uint8Array, label: string): string {
  const bytes = der instanceof Uint8Array ? der : new Uint8Array(der);
  const base64 = toBase64(bytes);
  const lines = base64.match(/.{1,64}/g) ?? [];
  return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----`;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

const b64urlToBytes = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const toB64url = (bytes: Uint8Array) => toBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const hex = (bytes: Uint8Array) => [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");

// ---------------------------------------------------------------- OpenSSH public key wire format

function sshString(bytes: Uint8Array): Uint8Array {
  const out = new Uint8Array(4 + bytes.length);
  new DataView(out.buffer).setUint32(0, bytes.length);
  out.set(bytes, 4);
  return out;
}
/** SSH mpint: big-endian, with a leading zero byte if the top bit is set. */
function sshMpint(bytes: Uint8Array): Uint8Array {
  let i = 0;
  while (i < bytes.length - 1 && bytes[i] === 0) i++;
  const trimmed = bytes.slice(i);
  return sshString(trimmed[0]! & 0x80 ? Uint8Array.of(0, ...trimmed) : trimmed);
}
const ascii = (s: string) => new TextEncoder().encode(s);
const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};

const SSH_CURVE: Record<string, string> = { "P-256": "nistp256", "P-384": "nistp384", "P-521": "nistp521" };

export function jwkToOpenSshBlob(jwk: JsonWebKey): { type: string; blob: Uint8Array } {
  if (jwk.kty === "RSA") {
    const type = "ssh-rsa";
    return { type, blob: concat(sshString(ascii(type)), sshMpint(b64urlToBytes(jwk.e!)), sshMpint(b64urlToBytes(jwk.n!))) };
  }
  if (jwk.kty === "EC") {
    const curve = SSH_CURVE[jwk.crv!]!;
    const type = `ecdsa-sha2-${curve}`;
    const point = concat(Uint8Array.of(4), b64urlToBytes(jwk.x!), b64urlToBytes(jwk.y!));
    return { type, blob: concat(sshString(ascii(type)), sshString(ascii(curve)), sshString(point)) };
  }
  const type = "ssh-ed25519";
  return { type, blob: concat(sshString(ascii(type)), sshString(b64urlToBytes(jwk.x!))) };
}

// ---------------------------------------------------------------- JWK helpers

/** RFC 7638 thumbprint (base64url SHA-256 of the required members in lexical order). */
export async function jwkThumbprint(jwk: JsonWebKey): Promise<string> {
  const req =
    jwk.kty === "RSA"
      ? { e: jwk.e, kty: jwk.kty, n: jwk.n }
      : jwk.kty === "EC"
        ? { crv: jwk.crv, kty: jwk.kty, x: jwk.x, y: jwk.y }
        : { crv: jwk.crv, kty: jwk.kty, x: jwk.x };
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(ascii(JSON.stringify(req))));
  return toB64url(new Uint8Array(digest));
}

function jwkAlg(o: Opts): string {
  if (o.keyType === "ed25519") return "EdDSA";
  if (o.keyType === "ec") {
    if (o.use === "enc") return "ECDH-ES";
    return { "P-256": "ES256", "P-384": "ES384", "P-521": "ES512" }[o.ecCurve ?? "P-256"];
  }
  return o.use === "enc" ? "RSA-OAEP-256" : "RS256";
}

function publicJwk(jwk: JsonWebKey): JsonWebKey {
  const { kty, crv, n, e, x, y } = jwk;
  return Object.fromEntries(Object.entries({ kty, crv, n, e, x, y }).filter(([, v]) => v !== undefined)) as JsonWebKey;
}

// ---------------------------------------------------------------- traditional (PKCS#1 / SEC1)

function derLength(n: number): Uint8Array {
  if (n < 0x80) return Uint8Array.of(n);
  const bytes: number[] = [];
  for (let v = n; v > 0; v >>= 8) bytes.unshift(v & 0xff);
  return Uint8Array.of(0x80 | bytes.length, ...bytes);
}
const derTlv = (tag: number, body: Uint8Array) => concat(Uint8Array.of(tag), derLength(body.length), body);
function derInteger(unsigned: Uint8Array): Uint8Array {
  let i = 0;
  while (i < unsigned.length - 1 && unsigned[i] === 0) i++;
  const v = unsigned.slice(i);
  return derTlv(0x02, v[0]! & 0x80 ? Uint8Array.of(0, ...v) : v);
}

function traditional(pkcs8Pem: string, spkiPem: string, jwk: JsonWebKey, keyType: Opts["keyType"]): { pub: string; priv: string } {
  const prv = jsrsasign.KEYUTIL.getKey(pkcs8Pem) as unknown as jsrsasign.RSAKey;
  // jsrsasign prefixes SEC1 keys with an EC PARAMETERS block; the curve is already inside the key.
  const priv = jsrsasign.KEYUTIL.getPEM(prv, "PKCS1PRV")
    .replace(/\r\n/g, "\n")
    .replace(/-----BEGIN EC PARAMETERS-----[\s\S]*?-----END EC PARAMETERS-----\s*/, "")
    .trim();
  if (keyType === "rsa") {
    // RSAPublicKey ::= SEQUENCE { modulus INTEGER, publicExponent INTEGER }
    const der = derTlv(0x30, concat(derInteger(b64urlToBytes(jwk.n!)), derInteger(b64urlToBytes(jwk.e!))));
    return { pub: derToPem(der, "RSA PUBLIC KEY"), priv };
  }
  // EC public keys have no "traditional" form; SPKI is what every tool expects.
  return { pub: spkiPem, priv };
}

export async function generateKeyPairPem(options: Opts): Promise<KeyPairPemResult> {
  const o: Opts = { rsaModulusLength: 2048, ecCurve: "P-256", format: "pem", use: "sig", comment: "", ...options };
  try {
    const enc = o.use === "enc";
    let algorithm: RsaHashedKeyGenParams | EcKeyGenParams | Algorithm;
    let usages: KeyUsage[];
    if (o.keyType === "rsa") {
      algorithm = {
        name: enc ? "RSA-OAEP" : "RSASSA-PKCS1-v1_5",
        modulusLength: o.rsaModulusLength!,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      };
      usages = enc ? ["encrypt", "decrypt"] : ["sign", "verify"];
    } else if (o.keyType === "ec") {
      algorithm = { name: enc ? "ECDH" : "ECDSA", namedCurve: o.ecCurve! };
      usages = enc ? ["deriveBits"] : ["sign", "verify"];
    } else {
      if (enc) throw new Error("Ed25519 keys are for signatures only — use X25519 or RSA/EC for encryption.");
      algorithm = { name: "Ed25519" };
      usages = ["sign", "verify"];
    }

    let keyPair: CryptoKeyPair;
    try {
      keyPair = (await crypto.subtle.generateKey(algorithm, true, usages)) as CryptoKeyPair;
    } catch (e) {
      if (o.keyType === "ed25519") throw new Error("This browser can't generate Ed25519 keys yet (needs Chrome 137+, Firefox 129+ or Safari 17+).");
      throw e;
    }
    const [spki, pkcs8, jwk] = await Promise.all([
      crypto.subtle.exportKey("spki", keyPair.publicKey),
      crypto.subtle.exportKey("pkcs8", keyPair.privateKey),
      crypto.subtle.exportKey("jwk", keyPair.privateKey),
    ]);
    const spkiPem = derToPem(spki, "PUBLIC KEY");
    const pkcs8Pem = derToPem(pkcs8, "PRIVATE KEY");
    const kid = await jwkThumbprint(jwk);
    const { type, blob } = jwkToOpenSshBlob(jwk);
    const fpBytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array(blob)));
    const fingerprint = `SHA256:${toBase64(fpBytes).replace(/=+$/, "")}`;

    let publicKeyPem = spkiPem;
    let privateKeyPem = pkcs8Pem;
    let note: string | undefined;
    switch (o.format) {
      case "traditional":
        if (o.keyType === "ed25519") {
          note = "Ed25519 has no PKCS#1/SEC1 form; showing PKCS#8.";
        } else {
          const t = traditional(pkcs8Pem, spkiPem, jwk, o.keyType);
          publicKeyPem = t.pub;
          privateKeyPem = t.priv;
          if (o.keyType === "ec") note = "EC public keys have no traditional form; the public key stays SPKI.";
        }
        break;
      case "jwk": {
        const meta = { kid, use: o.use, alg: jwkAlg(o) };
        publicKeyPem = JSON.stringify({ ...publicJwk(jwk), ...meta }, null, 2);
        // Drop WebCrypto's key_ops/ext/alg; kid, use and alg come from meta.
        const priv = Object.fromEntries(Object.entries(jwk).filter(([k]) => !["key_ops", "ext", "alg"].includes(k)));
        privateKeyPem = JSON.stringify({ ...priv, ...meta }, null, 2);
        break;
      }
      case "openssh":
        publicKeyPem = `${type} ${toBase64(blob)}${o.comment?.trim() ? ` ${o.comment.trim()}` : ""}`;
        note = "OpenSSH reads this PKCS#8 private key directly (chmod 600). Run `ssh-keygen -p -f key` to re-save it in OpenSSH format with a passphrase.";
        break;
    }
    return { publicKeyPem, privateKeyPem, fingerprint, kid, ...(note ? { note } : {}), error: null };
  } catch (err) {
    return {
      publicKeyPem: "",
      privateKeyPem: "",
      error: err instanceof Error ? err.message : "Could not generate a key pair in this browser.",
    };
  }
}

export { hex as bytesToHex };

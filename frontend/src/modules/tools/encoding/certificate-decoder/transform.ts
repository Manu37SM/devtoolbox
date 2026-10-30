import * as jsrsasign from "jsrsasign";
import type { CertificateDecoderOptions } from "./schema";

export interface CertificateInfo {
  subject: string;
  issuer: string;
  serialNumberHex: string;
  notBefore: string;
  notAfter: string;
  isCurrentlyValid: boolean;
  signatureAlgorithm: string;
  publicKeyAlgorithm: string;
  version: number;
  isSelfSigned: boolean;
  /** RSA modulus size or EC curve size in bits. */
  keySize?: number;
  sha256Fingerprint?: string;
  sha1Fingerprint?: string;
  subjectAltNames?: string[];
  keyUsage?: string[];
  extendedKeyUsage?: string[];
  isCA?: boolean;
  /** Whole days until notAfter (negative once expired). */
  daysRemaining?: number;
  /** For a chain: whether this certificate's signature verifies with the next one's key. */
  signedByNext?: boolean | null;
  warnings?: string[];
}

export interface CertificateDecoderResult {
  info: CertificateInfo | null;
  /** Every certificate in the input, leaf first, when several PEM blocks are pasted. */
  chain?: CertificateInfo[];
  error: string | null;
}

type Opts = Partial<CertificateDecoderOptions>;

const PEM_RE = /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g;

/** Accepts PEM, several PEM blocks, or bare base64 DER (as copied from a JKS or Kubernetes secret). */
function pemBlocks(input: string): string[] | null {
  const blocks = input.match(PEM_RE);
  if (blocks) return blocks;
  const b64 = input.replace(/\s+/g, "");
  if (/^MII[A-Za-z0-9+/]+={0,2}$/.test(b64)) {
    return [`-----BEGIN CERTIFICATE-----\n${b64.match(/.{1,64}/g)!.join("\n")}\n-----END CERTIFICATE-----`];
  }
  return null;
}

function formatDn(x: X509Ext, which: "subject" | "issuer", style: CertificateDecoderOptions["dnStyle"]): string {
  if (style === "openssl") return which === "subject" ? x.getSubjectString() : x.getIssuerString();
  const dn = (which === "subject" ? x.getSubject() : x.getIssuer()) as { array: { type: string; value: string }[][] };
  const esc = (v: string) => v.replace(/([,+"\\<>;=])/g, "\\$1").replace(/^([ #])/, "\\$1").replace(/ $/, "\\ ");
  return [...dn.array]
    .reverse()
    .map((rdn) => rdn.map((a) => `${a.type}=${esc(a.value)}`).join("+"))
    .join(",");
}

function fingerprint(hex: string, alg: "sha256" | "sha1", style: CertificateDecoderOptions["fingerprintStyle"]): string {
  const h = jsrsasign.KJUR.crypto.Util.hashHex(hex, alg);
  return style === "hex" ? h : h.toUpperCase().match(/../g)!.join(":");
}

/** The jsrsasign extension getters we use, typed loosely (their bundled types are stricter than the runtime shape). */
type X509Ext = Omit<jsrsasign.X509, "getExtSubjectAltName" | "getExtExtKeyUsage" | "getExtKeyUsageString" | "getExtBasicConstraints"> & {
  hex: string;
  getExtSubjectAltName?: () => { array?: Record<string, unknown>[] } | undefined;
  getExtExtKeyUsage?: () => { array?: string[] } | undefined;
  getExtKeyUsageString?: () => string;
  getExtBasicConstraints?: () => { cA?: boolean } | undefined;
};

function describe(x: X509Ext, o: Opts, now: Date): CertificateInfo {
  const notBefore = jsrsasign.zulutodate(x.getNotBefore());
  const notAfter = jsrsasign.zulutodate(x.getNotAfter());
  const publicKey = x.getPublicKey() as { type?: string; curveName?: string; n?: { bitLength(): number }; ecparams?: { keycharlen?: number } };
  const publicKeyAlgorithm =
    publicKey?.type === "EC" ? `EC (${publicKey.curveName ?? "unknown curve"})` : (publicKey?.type ?? "unknown");
  const keySize =
    publicKey?.type === "RSA"
      ? publicKey.n?.bitLength()
      : publicKey?.type === "EC"
        ? Number(/(\d{3})/.exec(publicKey.curveName ?? "")?.[1]) || undefined
        : undefined;

  const subject = formatDn(x, "subject", o.dnStyle ?? "openssl");
  const issuer = formatDn(x, "issuer", o.dnStyle ?? "openssl");
  const san = (x.getExtSubjectAltName?.()?.array ?? []).map((e) => {
    const [k, v] = Object.entries(e)[0] ?? ["?", ""];
    const label: Record<string, string> = { dns: "DNS", ip: "IP", rfc822: "email", uri: "URI" };
    return `${label[k] ?? k}:${typeof v === "string" ? v : JSON.stringify(v)}`;
  });
  const ku = x.getExtKeyUsageString?.();
  const eku = x.getExtExtKeyUsage?.()?.array ?? [];
  const isCA = x.getExtBasicConstraints?.()?.cA === true;
  const daysRemaining = Math.floor((notAfter.getTime() - now.getTime()) / 86_400_000);

  const warnings: string[] = [];
  const warnDays = o.expiryWarningDays ?? 30;
  if (now < notBefore) warnings.push(`Not valid until ${notBefore.toISOString()}.`);
  else if (daysRemaining < 0) warnings.push(`Expired ${-daysRemaining} day(s) ago.`);
  else if (daysRemaining <= warnDays) warnings.push(`Expires in ${daysRemaining} day(s).`);
  const sig = x.getSignatureAlgorithmField();
  if (/^(MD5|SHA1)with/i.test(sig) && subject !== issuer) warnings.push(`${sig} signatures are rejected by modern browsers and JDKs.`);
  if (publicKey?.type === "RSA" && keySize !== undefined && keySize < 2048) warnings.push(`${keySize}-bit RSA is below the 2048-bit minimum.`);
  if (!isCA && san.length === 0) warnings.push("No Subject Alternative Name — browsers and most TLS clients ignore the CN and will reject this for hostnames.");

  return {
    subject,
    issuer,
    serialNumberHex: x.getSerialNumberHex(),
    notBefore: notBefore.toISOString(),
    notAfter: notAfter.toISOString(),
    isCurrentlyValid: now >= notBefore && now <= notAfter,
    signatureAlgorithm: sig,
    publicKeyAlgorithm,
    version: x.getVersion(),
    isSelfSigned: x.getSubjectString() === x.getIssuerString(),
    keySize,
    sha256Fingerprint: fingerprint(x.hex, "sha256", o.fingerprintStyle ?? "colon"),
    sha1Fingerprint: fingerprint(x.hex, "sha1", o.fingerprintStyle ?? "colon"),
    subjectAltNames: san,
    keyUsage: ku ? ku.split(",") : [],
    extendedKeyUsage: eku,
    isCA,
    daysRemaining,
    warnings,
  };
}

export function decodeCertificate(pem: string, options: Opts = {}, now: Date = new Date()): CertificateDecoderResult {
  const trimmed = pem.trim();
  if (trimmed.length === 0) return { info: null, error: null };

  const blocks = pemBlocks(trimmed);
  if (!blocks) {
    return { info: null, error: "Expected a PEM block starting with -----BEGIN CERTIFICATE----- (or base64 DER)." };
  }

  try {
    const certs = blocks.map((b, i) => {
      const x = new jsrsasign.X509() as unknown as X509Ext;
      try {
        x.readCertPEM(b);
      } catch (e) {
        throw new Error(`Certificate ${i + 1}: ${e instanceof Error ? e.message : "could not be parsed"}`);
      }
      return x;
    });
    const chain = certs.map((x, i) => {
      const info = describe(x, options, now);
      const next = certs[i + 1];
      if (next) {
        let ok: boolean | null;
        try {
          ok = x.getIssuerString() === next.getSubjectString() ? x.verifySignature(next.getPublicKey()) : false;
        } catch {
          ok = null;
        }
        info.signedByNext = ok;
        if (ok === false) info.warnings!.push(`Not issued by certificate ${i + 2} — the chain is out of order or incomplete.`);
      }
      return info;
    });
    return { info: chain[0]!, ...(chain.length > 1 ? { chain } : {}), error: null };
  } catch (err) {
    return {
      info: null,
      error: err instanceof Error ? err.message : "Could not parse this certificate — check it's a valid PEM X.509 certificate.",
    };
  }
}

import * as jsrsasign from "jsrsasign";
import type { TransformResult } from "@/lib/tool-transform";
import type { CsrDecoderOptions } from "./schema";

export interface CsrInfo {
  subject: string;
  commonName: string | null;
  subjectAltNames: string[];
  keyUsage: string[];
  publicKeyAlgorithm: string;
  keySize: number | null;
  signatureAlgorithm: string;
  signatureValid: boolean | null;
  sha256Fingerprint: string;
  publicKeySha256: string;
  modulusSha256: string | null;
  warnings: string[];
}

interface CsrParam {
  subject: { str: string; array: { type: string; value: string }[][] };
  sbjpubkey: string;
  sigalg: string;
  extreq?: { extname: string; array?: Record<string, string>[]; names?: string[] }[];
}

const CSR_RE = /-----BEGIN (?:NEW )?CERTIFICATE REQUEST-----[\s\S]*?-----END (?:NEW )?CERTIFICATE REQUEST-----/;

function toPem(input: string): string | null {
  const m = CSR_RE.exec(input);
  if (m) return m[0].replace(/NEW CERTIFICATE REQUEST/g, "CERTIFICATE REQUEST");
  const b64 = input.replace(/\s+/g, "");
  if (/^MI[A-Za-z0-9+/]+={0,2}$/.test(b64) && b64.length > 100) return `-----BEGIN CERTIFICATE REQUEST-----\n${b64.match(/.{1,64}/g)!.join("\n")}\n-----END CERTIFICATE REQUEST-----`;
  return null;
}

const fp = (hex: string, style: CsrDecoderOptions["fingerprintStyle"]) => {
  const h = jsrsasign.KJUR.crypto.Util.hashHex(hex, "sha256");
  return style === "hex" ? h : h.toUpperCase().match(/../g)!.join(":");
};

function formatDn(p: CsrParam, style: CsrDecoderOptions["dnStyle"]): string {
  if (style === "openssl") return p.subject.str || "(empty)";
  const esc = (v: string) => v.replace(/([,+"\\<>;=])/g, "\\$1").replace(/^([ #])/, "\\$1").replace(/ $/, "\\ ");
  return [...p.subject.array].reverse().map((rdn) => rdn.map((a) => `${a.type}=${esc(a.value)}`).join("+")).join(",") || "(empty)";
}

const isPrivateIp = (ip: string) => /^(10\.|127\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip) || ip === "::1";

function hostMatches(pattern: string, host: string): boolean {
  const p = pattern.toLowerCase();
  const h = host.toLowerCase();
  if (p === h) return true;
  return p.startsWith("*.") && h.split(".").length === p.split(".").length && h.endsWith(p.slice(1));
}

export function decodeCsrInfo(pem: string, o: CsrDecoderOptions): CsrInfo {
  let p: CsrParam;
  try {
    p = jsrsasign.KJUR.asn1.csr.CSRUtil.getParam(pem) as unknown as CsrParam;
  } catch (e) {
    const der = jsrsasign.pemtohex(pem);
    if (/06032b6570|06032b6571/i.test(der)) throw new Error("Ed25519 and Ed448 requests are not supported by this decoder yet. Use: openssl req -in file.csr -noout -text");
    throw new Error(`This is not a readable certificate request (${(e as Error).message}).`);
  }
  const key = jsrsasign.KEYUTIL.getKey(p.sbjpubkey) as unknown as { type?: string; curveName?: string; n?: { bitLength(): number; toString(radix: number): string } };
  const isRsa = key.type === "RSA";
  const keySize = isRsa ? (key.n?.bitLength() ?? null) : key.type === "EC" ? (Number(/(\d{3})/.exec(key.curveName ?? "")?.[1]) || null) : null;
  const subjectCn = p.subject.array.flat().find((a) => a.type === "CN")?.value ?? null;

  const san = (p.extreq?.find((e) => e.extname === "subjectAltName")?.array ?? []).map((e) => {
    const [k, v] = Object.entries(e)[0] ?? ["?", ""];
    const label: Record<string, string> = { dns: "DNS", ip: "IP", rfc822: "email", uri: "URI" };
    return `${label[k] ?? k}:${v}`;
  });
  const keyUsage = p.extreq?.find((e) => e.extname === "keyUsage")?.names ?? [];

  let signatureValid: boolean | null = null;
  try {
    signatureValid = (jsrsasign.KJUR.asn1.csr.CSRUtil as unknown as { verifySignature(p: string): boolean }).verifySignature(pem);
  } catch {
    signatureValid = null;
  }
  const der = jsrsasign.pemtohex(pem);
  const spkiHex = jsrsasign.pemtohex(p.sbjpubkey);
  const modulus = isRsa && key.n ? key.n.toString(16) : null;

  const warnings: string[] = [];
  if (signatureValid === false) warnings.push("The request's signature does NOT verify against its own public key; it is corrupted or was altered.");
  if (/^(MD5|SHA1)with/i.test(p.sigalg)) warnings.push(`${p.sigalg} signatures are rejected by certificate authorities. Re-create the request with SHA-256.`);
  if (isRsa && keySize !== null && keySize < 2048) warnings.push(`${keySize}-bit RSA keys are below the 2048-bit minimum and will be refused by public CAs.`);
  if (key.type === "EC" && keySize !== null && keySize < 256) warnings.push(`The ${keySize}-bit elliptic curve is too small.`);
  if (!san.length) warnings.push("No Subject Alternative Name. Browsers ignore the CN, so this request is not enough for a TLS certificate; CAs usually copy the CN into a SAN, but you should list names explicitly.");
  const dnsNames = san.filter((s) => s.startsWith("DNS:")).map((s) => s.slice(4));
  if (subjectCn && san.length && !dnsNames.some((d) => hostMatches(d, subjectCn)) && /^[a-z0-9*.-]+\.[a-z]{2,}$/i.test(subjectCn)) {
    warnings.push(`The CN "${subjectCn}" is not repeated in the SAN list; modern clients only look at the SAN.`);
  }
  for (const ip of san.filter((s) => s.startsWith("IP:")).map((s) => s.slice(3))) if (isPrivateIp(ip)) warnings.push(`IP:${ip} is a private address; public CAs will not issue for it.`);
  for (const d of dnsNames) {
    if (/^[^*]+\*|\*[^.]|\*\.\*/.test(d)) warnings.push(`"${d}" is an invalid wildcard (only a leading "*." is allowed).`);
    else if (/\.(local|internal|lan|corp|home)$/i.test(d)) warnings.push(`"${d}" is an internal name; public CAs will not issue for it.`);
  }
  const expected = o.expectNames.split(/[,\s]+/).filter(Boolean);
  for (const h of expected) {
    const covered = dnsNames.some((d) => hostMatches(d, h)) || (!san.length && subjectCn !== null && hostMatches(subjectCn, h));
    if (!covered) warnings.push(`Expected name "${h}" is not covered by the request.`);
  }

  return {
    subject: formatDn(p, o.dnStyle),
    commonName: subjectCn,
    subjectAltNames: san,
    keyUsage,
    publicKeyAlgorithm: key.type === "EC" ? `EC (${key.curveName ?? "unknown curve"})` : (key.type ?? "unknown"),
    keySize,
    signatureAlgorithm: p.sigalg,
    signatureValid,
    sha256Fingerprint: fp(der, o.fingerprintStyle),
    publicKeySha256: fp(spkiHex, o.fingerprintStyle),
    modulusSha256: modulus ? fp(modulus.length % 2 ? `0${modulus}` : modulus, o.fingerprintStyle) : null,
    warnings,
  };
}

export function decodeCsr(input: string, options: Partial<CsrDecoderOptions>): TransformResult {
  const o: CsrDecoderOptions = {
    dnStyle: options.dnStyle ?? "openssl",
    output: options.output ?? "summary",
    expectNames: options.expectNames ?? "",
    fingerprintStyle: options.fingerprintStyle ?? "colon",
  };
  if (!input.trim()) return { output: "", error: null };
  const pem = toPem(input);
  if (!pem) return { output: "", error: { message: "No certificate request found. Paste a PEM block starting with -----BEGIN CERTIFICATE REQUEST----- (or the bare base64)." } };
  let info: CsrInfo;
  try {
    info = decodeCsrInfo(pem, o);
  } catch (e) {
    return { output: "", error: { message: (e as Error).message } };
  }
  if (o.output === "json") return { output: JSON.stringify(info, null, 2), error: null };
  const lines = [
    `Subject:            ${info.subject}`,
    `Subject Alt Names:  ${info.subjectAltNames.length ? info.subjectAltNames.join(", ") : "(none)"}`,
    `Key usage:          ${info.keyUsage.length ? info.keyUsage.join(", ") : "(not requested)"}`,
    `Public key:         ${info.publicKeyAlgorithm}${info.keySize ? `, ${info.keySize} bit` : ""}`,
    `Signature:          ${info.signatureAlgorithm} — ${info.signatureValid === true ? "valid" : info.signatureValid === false ? "INVALID" : "could not be checked"}`,
    "",
    `SHA-256 of the request:    ${info.sha256Fingerprint}`,
    `SHA-256 of the public key: ${info.publicKeySha256}`,
    ...(info.modulusSha256 ? [`SHA-256 of the RSA modulus: ${info.modulusSha256}`, "  (compare with the same value from your certificate or private key to confirm they belong together)"] : []),
  ];
  if (info.warnings.length) lines.push("", "Warnings:", ...info.warnings.map((w) => `  ! ${w}`));
  else lines.push("", "No problems found.");
  return { output: lines.join("\n"), error: null };
}

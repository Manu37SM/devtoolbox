import type { TransformResult } from "@/lib/tool-transform";
import type { TlsCipherSuiteLookupOptions } from "./schema";
import { SUITES } from "./suites";

export type Rating = "recommended" | "secure" | "weak" | "insecure";
export interface Suite { hex: string; iana: string; openssl: string; protocol: string; kex: string; auth: string; cipher: string; mac: string; pfs: boolean; aead: boolean; rating: Rating; reasons: string[] }

const byHex = new Map(SUITES.map((s) => [s[0], s]));
const byIana = new Map(SUITES.map((s) => [s[1].toUpperCase(), s]));
const byOpenssl = new Map(SUITES.filter((s) => s[2]).map((s) => [s[2].toUpperCase(), s]));

export function parseIana(name: string): Omit<Suite, "hex" | "openssl" | "protocol" | "rating" | "reasons"> {
  const n = name.toUpperCase().replace(/^SSL_/, "TLS_");
  if (!/_WITH_/.test(n)) {
    const m = /^TLS_(.+)_(SHA256|SHA384)$/.exec(n);
    const cipher = m ? m[1]! : n.replace(/^TLS_/, "");
    return { iana: name, kex: "any (TLS 1.3: ECDHE/DHE)", auth: "any (certificate)", cipher, mac: "AEAD", pfs: true, aead: true };
  }
  const [left, right] = n.replace(/^TLS_/, "").split("_WITH_") as [string, string];
  const parts = left.split("_");
  let kex = parts[0]!;
  let auth = parts.slice(1).join("_") || parts[0]!;
  if (left === "RSA" || left === "RSA_EXPORT") { kex = left; auth = "RSA"; }
  if (/ANON/.test(left)) { kex = parts[0]!; auth = "anonymous"; }
  if (/^(PSK|ECDHE_PSK|DHE_PSK|RSA_PSK)$/.test(left)) { kex = left; auth = left === "RSA_PSK" ? "RSA" : "PSK"; }
  if (/^SRP/.test(left)) { kex = "SRP"; auth = parts.slice(2).join("_") || "SRP"; }
  const macMatch = /_(SHA|SHA256|SHA384|MD5)$/.exec(right);
  const aead = /GCM|CHACHA20|CCM|POLY1305/.test(right);
  const mac = aead ? "AEAD" : macMatch ? macMatch[1]!.replace(/^SHA$/, "SHA1") : "none";
  const cipher = aead && macMatch ? right.slice(0, -macMatch[0].length) : macMatch ? right.slice(0, -macMatch[0].length) : right;
  return { iana: name, kex, auth, cipher, mac, pfs: /^(ECDHE|DHE)/.test(kex), aead };
}

export function rate(s: Pick<Suite, "kex" | "auth" | "cipher" | "mac" | "pfs" | "aead" | "iana">): { rating: Rating; reasons: string[] } {
  const reasons: string[] = [];
  const insecure: string[] = [];
  if (/NULL/.test(s.cipher)) insecure.push("no encryption (NULL cipher)");
  if (s.auth === "anonymous") insecure.push("anonymous key exchange: no server authentication, trivial man-in-the-middle");
  if (/EXPORT/.test(s.kex) || /40/.test(s.cipher)) insecure.push("export-grade crypto (FREAK/Logjam)");
  if (/RC4/.test(s.cipher)) insecure.push("RC4 is broken (RFC 7465 prohibits it)");
  if (/^DES|_DES_|^DES40/.test(s.cipher) && !/3DES/.test(s.cipher)) insecure.push("single DES (56-bit key)");
  if (s.mac === "MD5") insecure.push("MD5 MAC");
  if (insecure.length) return { rating: "insecure", reasons: insecure };
  if (/3DES/.test(s.cipher)) reasons.push("3DES has a 64-bit block (Sweet32)");
  if (!s.aead) reasons.push("CBC mode with a separate MAC (Lucky13-style padding attacks; no AEAD)");
  if (!s.pfs && !/PSK/.test(s.kex)) reasons.push("no forward secrecy (static RSA/DH key exchange)");
  if (/^(IDEA|SEED|CAMELLIA|ARIA)/.test(s.cipher) && s.aead === false) reasons.push(`${s.cipher.split("_")[0]} is rarely supported or audited in modern stacks`);
  if (s.mac === "SHA1" && s.aead === false) reasons.push("SHA-1 HMAC");
  if (reasons.length) return { rating: "weak", reasons };
  const tls13 = /any/.test(s.kex);
  if (tls13 && /CCM_8/.test(s.cipher)) return { rating: "secure", reasons: ["CCM_8 has a short 64-bit tag; meant for constrained devices"] };
  if (tls13 || (/^ECDHE/.test(s.kex) && /^(RSA|ECDSA)$/.test(s.auth) && /(AES_\d+_GCM|CHACHA20)/.test(s.cipher))) return { rating: "recommended", reasons: tls13 ? ["TLS 1.3 suite"] : ["ECDHE forward secrecy with an AEAD cipher"] };
  if (/^DHE/.test(s.kex)) return { rating: "secure", reasons: ["DHE is safe only with 2048-bit+ groups and is slower than ECDHE"] };
  return { rating: "secure", reasons: ["forward secrecy with an AEAD cipher"] };
}

export function lookup(token: string): Suite | null {
  const t = token.trim().replace(/^['"]|['"]$/g, "");
  if (!t) return null;
  let row: [string, string, string, string] | undefined;
  const hex = /^(?:0x)?([0-9a-f]{2})[,\s]*(?:0x)?([0-9a-f]{2})$/i.exec(t);
  if (hex) row = byHex.get(`${hex[1]}${hex[2]}`.toUpperCase());
  row ??= byIana.get(t.toUpperCase()) ?? byOpenssl.get(t.toUpperCase());
  if (!row && /^(TLS|SSL)_/i.test(t)) {
    const parsed = parseIana(t);
    return { ...parsed, hex: "?", openssl: "?", protocol: "?", ...rate(parsed) };
  }
  if (!row) return null;
  if (/SCSV$/.test(row[1])) return { iana: row[1], hex: row[0], openssl: "-", protocol: "-", kex: "-", auth: "-", cipher: "-", mac: "-", pfs: false, aead: false, rating: "secure", reasons: ["signalling value, not a real cipher suite"] };
  const parsed = parseIana(row[1]);
  return { ...parsed, hex: row[0], openssl: row[2] || "-", protocol: row[3] || "-", ...rate(parsed) };
}

const ORDER: Record<Rating, number> = { insecure: 0, weak: 1, secure: 2, recommended: 3 };

export function runTlsCipherSuiteLookup(input: string, options: TlsCipherSuiteLookupOptions): TransformResult {
  const tokens = input.split(/[\n,;:\s]+/).filter(Boolean);
  if (tokens.length === 0) return { output: "", error: null };
  const merged: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const a = tokens[i]!, b = tokens[i + 1];
    if (/^0x[0-9a-f]{2}$/i.test(a) && b && /^0x[0-9a-f]{2}$/i.test(b)) { merged.push(`${a}${b.slice(2)}`); i++; } else merged.push(a);
  }
  const results = merged.map((t) => ({ t, s: lookup(t) }));
  const sorted = options.sort === "rating" ? [...results].sort((x, y) => (x.s ? ORDER[x.s.rating] : -1) - (y.s ? ORDER[y.s.rating] : -1)) : results;
  const out: string[] = [];
  const counts: Record<string, number> = {};
  for (const { t, s } of sorted) {
    if (!s) { out.push(`${t}\n  Unknown cipher suite.`); continue; }
    counts[s.rating] = (counts[s.rating] ?? 0) + 1;
    out.push(`${s.rating.toUpperCase().padEnd(11)} ${s.iana}\n  ${s.hex !== "?" ? `0x${s.hex.slice(0, 2)},0x${s.hex.slice(2)}` : "code unknown"} | OpenSSL ${s.openssl} | ${s.protocol}\n  Key exchange ${s.kex}, auth ${s.auth}, cipher ${s.cipher}, MAC ${s.mac}${s.pfs ? ", forward secret" : ""}\n  ${s.reasons.join("; ")}`);
  }
  const summary = (["insecure", "weak", "secure", "recommended"] as Rating[]).filter((r) => counts[r]).map((r) => `${counts[r]} ${r}`).join(", ");
  return { output: `${summary ? `${summary}\n\n` : ""}${out.join("\n\n")}`, error: null };
}

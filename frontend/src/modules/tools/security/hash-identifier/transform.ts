import type { TransformResult } from "@/lib/tool-transform";
import type { HashIdentifierOptions } from "./schema";

export interface HashGuess { name: string; confidence: "high" | "medium" | "low"; note?: string }

const PREFIXED: Array<[RegExp, string, string]> = [
  [/^\$2[abxy]?\$\d\d\$[./A-Za-z0-9]{53}$/, "bcrypt", "Adaptive password hash; the number after the second $ is the cost factor."],
  [/^\$argon2(id|i|d)\$/, "Argon2", "Memory-hard password hash (variant is in the prefix); parameters follow m=,t=,p=."],
  [/^\$scrypt\$/, "scrypt", "Memory-hard password hash."],
  [/^\$y\$/, "yescrypt", "Used by modern Linux /etc/shadow."],
  [/^\$1\$[^$]{0,8}\$[./A-Za-z0-9]{22}$/, "MD5-crypt ($1$)", "Legacy Unix crypt; avoid for new systems."],
  [/^\$apr1\$/, "Apache MD5 (apr1)", "Legacy .htpasswd format."],
  [/^\$5\$/, "SHA-256-crypt ($5$)", "Unix crypt with SHA-256."],
  [/^\$6\$/, "SHA-512-crypt ($6$)", "Unix crypt with SHA-512; common in /etc/shadow."],
  [/^\$pbkdf2-sha(1|256|512)\$/, "PBKDF2 (passlib format)", "Iteration count is the first field after the prefix."],
  [/^pbkdf2_sha(256|1)\$\d+\$/, "Django PBKDF2", "Django password format: algorithm$iterations$salt$hash."],
  [/^\$[PH]\$[./A-Za-z0-9]{31}$/, "phpass (WordPress/phpBB)", "Portable PHP password hashing; legacy."],
  [/^\$S\$[./A-Za-z0-9]{52}$/, "Drupal 7 (SHA-512 phpass)", ""],
  [/^\{SHA\}[A-Za-z0-9+/]{27}=$/, "LDAP / htpasswd SHA-1 ({SHA})", "Unsalted SHA-1, base64 — weak."],
  [/^\{SSHA\}/, "LDAP salted SHA-1 ({SSHA})", "SHA-1 + salt, base64."],
  [/^\*[0-9A-F]{40}$/, "MySQL 4.1+ (double SHA-1)", "Value from mysql.user; legacy mysql_native_password."],
  [/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/, "JWT (not a hash)", "Looks like a JSON Web Token; decode it with the JWT Decoder."],
];

const HEX_BY_LEN: Record<number, HashGuess[]> = {
  8: [{ name: "CRC-32 / Adler-32", confidence: "medium", note: "Checksums, not cryptographic hashes." }],
  16: [{ name: "MySQL323 / half-MD5", confidence: "low" }, { name: "CRC-64", confidence: "low" }],
  32: [
    { name: "MD5", confidence: "high", note: "Broken for security; fine as a checksum." },
    { name: "NTLM", confidence: "medium", note: "Windows password hash (MD4 of UTF-16LE)." },
    { name: "MD4", confidence: "low" },
    { name: "LM", confidence: "low" },
  ],
  40: [
    { name: "SHA-1", confidence: "high", note: "Collision-broken; also the length of a Git object id." },
    { name: "RIPEMD-160", confidence: "low" },
  ],
  56: [{ name: "SHA-224", confidence: "high" }, { name: "SHA3-224", confidence: "medium" }],
  64: [
    { name: "SHA-256", confidence: "high" },
    { name: "SHA3-256", confidence: "medium" },
    { name: "BLAKE2s-256", confidence: "low" },
    { name: "Keccak-256", confidence: "low", note: "Ethereum-style hashes." },
  ],
  96: [{ name: "SHA-384", confidence: "high" }, { name: "SHA3-384", confidence: "medium" }],
  128: [
    { name: "SHA-512", confidence: "high" },
    { name: "SHA3-512", confidence: "medium" },
    { name: "BLAKE2b-512", confidence: "low" },
    { name: "Whirlpool", confidence: "low" },
  ],
};

const B64_BY_LEN: Record<number, string> = { 24: "MD5 (base64)", 28: "SHA-1 (base64)", 44: "SHA-256 (base64)", 64: "SHA-384 (base64)", 88: "SHA-512 (base64)" };

export function identifyHash(raw: string): HashGuess[] {
  const s = raw.trim();
  if (!s) return [];
  for (const [re, name, note] of PREFIXED) if (re.test(s)) return [{ name, confidence: "high", note: note || undefined }];
  const prefixed = /^(md5|sha1|sha224|sha256|sha384|sha512)[:$]([0-9a-f]+)$/i.exec(s);
  if (prefixed) return identifyHash(prefixed[2]!).map((g) => ({ ...g, note: g.note ?? `Tagged with "${prefixed[1]}" prefix.` }));
  if (/^[0-9a-f]+$/i.test(s)) {
    const guesses = HEX_BY_LEN[s.length];
    if (guesses) {
      const mixed = /[a-f]/.test(s) && /[A-F]/.test(s);
      return mixed ? guesses.map((g) => ({ ...g, note: [g.note, "Mixed-case hex is unusual for a hash."].filter(Boolean).join(" ") })) : guesses;
    }
    return [{ name: `Hex string of ${s.length} digits (${s.length / 2} bytes)`, confidence: "low", note: "Length does not match a common hash." }];
  }
  if (/^[A-Za-z0-9+/]+={0,2}$/.test(s) && B64_BY_LEN[s.length]) return [{ name: B64_BY_LEN[s.length]!, confidence: "medium" }];
  return [];
}

export function identifyHashes(input: string, options: HashIdentifierOptions): TransformResult {
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return { output: "", error: null };
  const unknown: string[] = [];
  const blocks = lines.map((l) => {
    const g = identifyHash(l);
    if (!g.length) {
      unknown.push(l);
      return `> ${l}\n  No match`;
    }
    const rows = g.map((x, i) => `  ${i + 1}. ${x.name} [${x.confidence}]${options.showNotes && x.note ? ` — ${x.note}` : ""}`);
    return [`> ${l.length > 80 ? l.slice(0, 77) + "…" : l}`, ...rows].join("\n");
  });
  return { output: blocks.join("\n\n"), error: unknown.length ? { message: `${unknown.length} line(s) did not match any known hash format` } : null };
}

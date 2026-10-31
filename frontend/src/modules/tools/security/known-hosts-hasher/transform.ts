import { KJUR, b64tohex, hextob64 } from "jsrsasign";
import type { TransformResult } from "@/lib/tool-transform";
import type { KnownHostsHasherOptions } from "./schema";

const KEY_TYPES = /^(ssh-(ed25519|rsa|dss)|ecdsa-sha2-nistp(256|384|521)|sk-ssh-ed25519@openssh\.com|sk-ecdsa-sha2-nistp256@openssh\.com)$/;

export function hostHash(saltB64: string, host: string): string {
  const mac = new KJUR.crypto.Mac({ alg: "HmacSHA1", pass: { hex: b64tohex(saltB64) } });
  mac.updateString(host);
  return hextob64(mac.doFinal());
}

const randomSalt = (): string => {
  const b = new Uint8Array(20);
  crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b));
};

const hashed = (salt: string, host: string) => `|1|${salt}|${hostHash(salt, host)}`;
const isSaltValid = (s: string) => /^[A-Za-z0-9+/]{27}=$/.test(s); // 20 bytes

interface Entry { marker: string; hosts: string; rest: string }

/** Split a known_hosts line into marker, host list and the rest (key type, key, comment). */
function splitEntry(line: string): Entry | null {
  const parts = line.split(/\s+/);
  let i = 0;
  let marker = "";
  if (parts[0]!.startsWith("@")) { marker = parts[0]!; i = 1; }
  const hosts = parts[i];
  const type = parts[i + 1];
  if (!hosts || !type || !KEY_TYPES.test(type)) return null;
  return { marker, hosts, rest: parts.slice(i + 1).join(" ") };
}

export function knownHostsHasher(input: string, options: Partial<KnownHostsHasherOptions>): TransformResult {
  const o: KnownHostsHasherOptions = { action: options.action ?? "hash", port: options.port ?? 22, salt: options.salt ?? "", lowercase: options.lowercase ?? true };
  const fail = (message: string): TransformResult => ({ output: "", error: { message } });
  if (o.salt && !isSaltValid(o.salt)) return fail("A fixed salt must be 20 bytes encoded as base64 (28 characters ending in =).");
  const lines = input.split(/\r?\n/);
  if (!lines.some((l) => l.trim())) return { output: "", error: null };

  if (o.action === "match") {
    const real = lines.map((l) => l.trim()).filter(Boolean);
    const target = real[0]!;
    if (target.startsWith("|") || splitEntry(target)) return fail("The first line must be the host name to look for (e.g. github.com or [example.com]:2222); the known_hosts lines follow it.");
    const candidates = [...new Set([target, target.toLowerCase()])];
    const out: string[] = [];
    let hits = 0, hashedLines = 0;
    for (const [n, line] of real.slice(1).entries()) {
      if (line.startsWith("#")) continue;
      const e = splitEntry(line);
      if (!e) { out.push(`line ${n + 2}: not a known_hosts entry`); continue; }
      let matched = false;
      for (const h of e.hosts.split(",")) {
        const m = /^\|1\|([^|]+)\|([^|]+)$/.exec(h);
        if (m) {
          hashedLines++;
          if (candidates.some((c) => hostHash(m[1]!, c) === m[2])) matched = true;
        } else if (candidates.includes(h) || candidates.some((c) => h.replace(/^\[|\]:\d+$/g, "") === c)) matched = true;
      }
      if (matched) { hits++; out.push(`✓ line ${n + 2} matches: ${e.marker ? e.marker + " " : ""}${e.rest.split(" ").slice(0, 2).join(" ").slice(0, 60)}…`); }
    }
    const head = hits ? `${target} is present (${hits} matching entr${hits === 1 ? "y" : "ies"})` : `${target} was not found in ${real.length - 1} entr${real.length === 2 ? "y" : "ies"}`;
    return { output: [head, ...out, hashedLines ? `(${hashedLines} hashed host field${hashedLines === 1 ? "" : "s"} checked with HMAC-SHA1)` : ""].filter(Boolean).join("\n") + "\n", error: null };
  }

  const out: string[] = [];
  const notes: string[] = [];
  for (const [n, raw] of lines.entries()) {
    const line = raw.trim();
    if (!line) { out.push(""); continue; }
    if (line.startsWith("#")) { out.push(line); continue; }
    const wrap = (h: string) => {
      let host = o.lowercase ? h.toLowerCase() : h;
      if (!host.startsWith("[") && o.port !== 22) host = `[${host}]:${o.port}`;
      return host;
    };
    const entry = splitEntry(line);
    if (entry) {
      for (const h of entry.hosts.split(",")) {
        if (h.startsWith("|1|")) { out.push(`${entry.marker ? entry.marker + " " : ""}${h} ${entry.rest}`.trim()); continue; }
        if (/[*?!]/.test(h)) { notes.push(`line ${n + 1}: "${h}" uses a wildcard or negation and cannot be hashed; left as is.`); out.push(`${entry.marker ? entry.marker + " " : ""}${h} ${entry.rest}`.trim()); continue; }
        out.push(`${entry.marker ? entry.marker + " " : ""}${hashed(o.salt || randomSalt(), wrap(h))} ${entry.rest}`.trim());
      }
    } else {
      if (/\s/.test(line)) return fail(`Line ${n + 1}: expected a host name or a known_hosts entry ("host ssh-ed25519 AAAA…").`);
      for (const h of line.split(",")) {
        if (!h) continue;
        if (/[*?!]/.test(h)) return fail(`Line ${n + 1}: "${h}" is a pattern; patterns cannot be hashed.`);
        if (!/^(\[[^\]]+\]:\d+|[A-Za-z0-9._:-]+)$/.test(h)) return fail(`Line ${n + 1}: "${h}" is not a valid host name or address.`);
        out.push(hashed(o.salt || randomSalt(), wrap(h)));
      }
    }
  }
  return { output: [...out, ...(notes.length ? ["", ...notes.map((x) => `# ${x}`)] : [])].join("\n").replace(/\n+$/, "") + "\n", error: null };
}

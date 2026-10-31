import { KJUR, b64tohex, hextob64 } from "jsrsasign";
import type { TransformResult } from "@/lib/tool-transform";
import type { AuthorizedKeysBuilderOptions } from "./schema";

const KEY_TYPES = [
  "ssh-ed25519", "ssh-rsa", "ssh-dss", "ecdsa-sha2-nistp256", "ecdsa-sha2-nistp384", "ecdsa-sha2-nistp521",
  "sk-ssh-ed25519@openssh.com", "sk-ecdsa-sha2-nistp256@openssh.com",
];
const FROM_PATTERN = /^!?[A-Za-z0-9*?.:_\-/\[\]]+$/;

interface Parsed { type: string; blob: string; comment: string; existing: string; bits: number | null }

const hexToBytes = (hex: string) => hex.match(/../g)?.map((h) => parseInt(h, 16)) ?? [];

/** Read the length-prefixed fields of an OpenSSH public-key blob. */
function readFields(bytes: number[]): number[][] | null {
  const fields: number[][] = [];
  let i = 0;
  while (i < bytes.length) {
    if (i + 4 > bytes.length) return null;
    const len = ((bytes[i]! << 24) | (bytes[i + 1]! << 16) | (bytes[i + 2]! << 8) | bytes[i + 3]!) >>> 0;
    i += 4;
    if (i + len > bytes.length) return null;
    fields.push(bytes.slice(i, i + len));
    i += len;
  }
  return fields;
}

export function sshFingerprint(blobB64: string): string {
  const digest = new KJUR.crypto.MessageDigest({ alg: "sha256", prov: "cryptojs" }).digestHex(b64tohex(blobB64));
  return "SHA256:" + hextob64(digest).replace(/=+$/, "");
}

function parseLine(line: string): Parsed | string {
  // Find the first token that is a key type; everything before it is an options field.
  // A quoted option value may contain spaces, so scan with quote awareness.
  let i = 0;
  let inQuote = false;
  let tokenStart = 0;
  let found = -1;
  for (; i <= line.length; i++) {
    const c = line[i];
    if (c === "\\" && inQuote) { i++; continue; }
    if (c === '"') inQuote = !inQuote;
    if ((c === " " || c === "\t" || c === undefined) && !inQuote) {
      const tok = line.slice(tokenStart, i);
      if (KEY_TYPES.includes(tok)) { found = tokenStart; break; }
      tokenStart = i + 1;
    }
  }
  if (found < 0) return "no recognised key type (expected ssh-ed25519, ssh-rsa, ecdsa-sha2-*, sk-*)";
  const existing = line.slice(0, found).trim();
  const rest = line.slice(found).trim().split(/\s+/);
  const type = rest[0]!;
  const blob = rest[1];
  if (!blob) return "key type without key data";
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(blob)) return "key data is not valid base64";
  const fields = readFields(hexToBytes(b64tohex(blob)));
  if (!fields || fields.length === 0) return "key data is truncated or malformed";
  const inner = String.fromCharCode(...fields[0]!);
  if (inner !== type) return `key data declares type "${inner}" but the line says "${type}"`;
  let bits: number | null = null;
  if (type === "ssh-rsa") {
    const n = fields[2];
    if (!n) return "RSA key is missing its modulus";
    let k = 0;
    while (k < n.length && n[k] === 0) k++;
    bits = (n.length - k) * 8 - Math.clz32(n[k] ?? 1) + 24;
  } else if (type === "ssh-ed25519" || type === "sk-ssh-ed25519@openssh.com") bits = 256;
  else if (type.startsWith("ecdsa") || type.startsWith("sk-ecdsa")) bits = type.includes("521") ? 521 : type.includes("384") ? 384 : 256;
  return { type, blob, comment: rest.slice(2).join(" "), existing, bits };
}

export function authorizedKeysBuilder(input: string, options: Partial<AuthorizedKeysBuilderOptions>): TransformResult {
  const o: AuthorizedKeysBuilderOptions = {
    restrict: options.restrict ?? false, noPortForwarding: options.noPortForwarding ?? false, noAgentForwarding: options.noAgentForwarding ?? false,
    noX11Forwarding: options.noX11Forwarding ?? false, noPty: options.noPty ?? false, noUserRc: options.noUserRc ?? false, from: options.from ?? "",
    command: options.command ?? "", expiry: options.expiry ?? "", permitOpen: options.permitOpen ?? "", keepExisting: options.keepExisting ?? false,
    fingerprints: options.fingerprints ?? true, defaultComment: options.defaultComment ?? "", dedupe: options.dedupe ?? true,
  };
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  if (!lines.length) return { output: "", error: null };
  const fail = (message: string): TransformResult => ({ output: "", error: { message } });

  const fromList = o.from.split(/[\s,]+/).filter(Boolean);
  for (const p of fromList) if (!FROM_PATTERN.test(p)) return fail(`from= pattern "${p}" contains characters sshd does not accept (use host names, IPs, CIDR, * and ?).`);
  if (o.expiry && !/^\d{8}(\d{4}(\d{2})?)?Z?$/.test(o.expiry)) return fail("Expiry must be YYYYMMDD, YYYYMMDDHHMM or YYYYMMDDHHMMSS (append Z for UTC).");
  if (o.expiry) {
    const mo = Number(o.expiry.slice(4, 6)), d = Number(o.expiry.slice(6, 8));
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return fail(`Expiry "${o.expiry}" is not a real date.`);
  }
  if (o.command && /[\r\n]/.test(o.command)) return fail("Forced command must be a single line.");
  const permit = o.permitOpen.split(/[\s,]+/).filter(Boolean);
  for (const p of permit) if (!/^([A-Za-z0-9.*_-]+|\[[0-9A-Fa-f:]+\]):(\d{1,5}|\*)$/.test(p)) return fail(`permitopen "${p}" must be host:port.`);

  const warnings: string[] = [];
  const opts: string[] = [];
  if (o.restrict) opts.push("restrict");
  else {
    if (o.noPortForwarding) opts.push("no-port-forwarding");
    if (o.noAgentForwarding) opts.push("no-agent-forwarding");
    if (o.noX11Forwarding) opts.push("no-X11-forwarding");
    if (o.noPty) opts.push("no-pty");
    if (o.noUserRc) opts.push("no-user-rc");
  }
  if (fromList.length) opts.push(`from="${fromList.join(",")}"`);
  if (o.command) opts.push(`command="${o.command.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`);
  if (permit.length) opts.push(...permit.map((p) => `permitopen="${p}"`));
  if (o.expiry) opts.push(`expiry-time="${o.expiry}"`);
  if (o.restrict && o.permitOpen === "" && (o.noPortForwarding || o.noPty)) warnings.push("restrict already implies the individual no-* options.");
  if (o.restrict && o.command === "") warnings.push("restrict without a forced command leaves a key that authenticates but can do almost nothing (no pty, no forwarding). Add a forced command or re-enable what you need.");

  const out: string[] = [];
  const seen = new Set<string>();
  for (const [n, line] of lines.entries()) {
    const p = parseLine(line);
    if (typeof p === "string") return fail(`Line ${n + 1}: ${p}.`);
    if (o.dedupe) {
      if (seen.has(p.blob)) { warnings.push(`Line ${n + 1}: duplicate of an earlier key (${p.comment || "no comment"}) — removed.`); continue; }
      seen.add(p.blob);
    }
    const label = p.comment || `line ${n + 1}`;
    if (p.type === "ssh-dss") warnings.push(`${label}: DSA keys are disabled by default in OpenSSH ≥ 7.0 and will not authenticate.`);
    if (p.type === "ssh-rsa" && p.bits !== null && p.bits < 2048) warnings.push(`${label}: RSA ${p.bits}-bit is too short; use at least 3072 or switch to ed25519.`);
    else if (p.type === "ssh-rsa" && p.bits !== null && p.bits < 3072) warnings.push(`${label}: RSA ${p.bits}-bit is acceptable today but 3072+ or ed25519 is recommended.`);
    const mine = o.keepExisting && p.existing ? [p.existing, ...opts] : opts;
    const comment = p.comment || o.defaultComment;
    if (o.fingerprints) out.push(`# ${p.type} ${p.bits ?? "?"} ${sshFingerprint(p.blob)}${comment ? ` ${comment}` : ""}`);
    out.push(`${mine.length ? mine.join(",") + " " : ""}${p.type} ${p.blob}${comment ? ` ${comment}` : ""}`);
  }
  const head = [...new Set(warnings)].map((w) => `# WARNING: ${w}`);
  return { output: [...head, ...out].join("\n") + "\n", error: null };
}

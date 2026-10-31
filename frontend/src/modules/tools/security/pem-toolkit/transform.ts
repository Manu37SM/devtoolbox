import * as jsrsasign from "jsrsasign";
import type { TransformResult } from "@/lib/tool-transform";
import type { PemToolkitOptions } from "./schema";

export interface PemBlock {
  label: string;
  base64: string;
  der: Uint8Array;
  /** Header lines such as "Proc-Type: 4,ENCRYPTED" */
  headers: string[];
}

const BLOCK_RE = /-----BEGIN ([A-Z0-9 ]+)-----([\s\S]*?)-----END \1-----/g;

const b64ToBytes = (b64: string): Uint8Array => {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};
const bytesToB64 = (b: Uint8Array): string => {
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s);
};
const toHex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

export function parsePemBlocks(text: string): PemBlock[] {
  const blocks: PemBlock[] = [];
  for (const m of text.matchAll(BLOCK_RE)) {
    const lines = m[2]!.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const headers = lines.filter((l) => /^[A-Za-z-]+:/.test(l));
    const body = lines.filter((l) => !/^[A-Za-z-]+:/.test(l)).join("");
    let der: Uint8Array;
    try {
      const clean = body.replace(/=+$/, "");
      der = b64ToBytes(clean.padEnd(clean.length + ((4 - (clean.length % 4)) % 4), "="));
    } catch {
      throw new Error(`Block "${m[1]}" contains invalid base64.`);
    }
    blocks.push({ label: m[1]!, base64: bytesToB64(der), der, headers });
  }
  return blocks;
}

export function formatPem(label: string, der: Uint8Array, width: number, eol: string, headers: string[] = []): string {
  const b64 = bytesToB64(der);
  const lines = b64.match(new RegExp(`.{1,${width}}`, "g")) ?? [];
  const head = headers.length ? [...headers, ""] : [];
  return [`-----BEGIN ${label}-----`, ...head, ...lines, `-----END ${label}-----`].join(eol);
}

function sha256(b: Uint8Array): string {
  return jsrsasign.KJUR.crypto.Util.hashHex(toHex(b), "sha256");
}

function describeCert(b: PemBlock): string[] {
  try {
    const x = new jsrsasign.X509();
    x.readCertHex(toHex(b.der));
    const nb = x.getNotBefore();
    const na = x.getNotAfter();
    const day = (z: string) => {
      const m = /^(\d{2}|\d{4})(\d{2})(\d{2})/.exec(z);
      if (!m) return z;
      const yy = m[1]!.length === 2 ? (Number(m[1]) >= 50 ? `19${m[1]}` : `20${m[1]}`) : m[1];
      return `${yy}-${m[2]}-${m[3]}`;
    };
    return [`    subject: ${x.getSubjectString()}`, `    issuer:  ${x.getIssuerString()}`, `    valid:   ${day(nb)} to ${day(na)}`];
  } catch {
    return [];
  }
}

export function pemToolkit(input: string, options: Partial<PemToolkitOptions>): TransformResult {
  const o: PemToolkitOptions = {
    action: options.action ?? "list",
    index: options.index ?? 1,
    labelFilter: options.labelFilter ?? "",
    label: options.label ?? "CERTIFICATE",
    lineWidth: options.lineWidth ?? 64,
    derFormat: options.derFormat ?? "base64",
    eol: options.eol ?? "lf",
  };
  if (!input.trim()) return { output: "", error: null };
  const eol = o.eol === "crlf" ? "\r\n" : "\n";
  const fail = (message: string): TransformResult => ({ output: "", error: { message } });

  if (o.action === "from-der") {
    const raw = input.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
    if (!raw) return fail("Paste the DER bytes as base64 or hex.");
    let der: Uint8Array;
    try {
      if (/^(0x)?[0-9a-fA-F]+$/.test(raw) && raw.replace(/^0x/, "").length % 2 === 0 && o.derFormat !== "base64") {
        const h = raw.replace(/^0x/, "");
        der = Uint8Array.from(h.match(/../g)!, (x) => parseInt(x, 16));
      } else {
        der = b64ToBytes(raw.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(raw.length / 4) * 4, "="));
      }
    } catch {
      return fail("That is not valid base64 or hex.");
    }
    if (der.length === 0) return fail("No bytes found.");
    return { output: formatPem(o.label.trim().toUpperCase() || "CERTIFICATE", der, o.lineWidth, eol), error: null };
  }

  let blocks: PemBlock[];
  try {
    blocks = parsePemBlocks(input);
  } catch (e) {
    return fail((e as Error).message);
  }
  if (!blocks.length) return fail("No PEM blocks found. A block starts with -----BEGIN … ----- and ends with -----END … -----.");
  const want = o.labelFilter.trim().toUpperCase();
  const filtered = want ? blocks.filter((b) => b.label === want) : blocks;
  if (!filtered.length) return fail(`No blocks with the label "${want}". Found: ${[...new Set(blocks.map((b) => b.label))].join(", ")}.`);

  switch (o.action) {
    case "list": {
      const lines = [`${filtered.length} block${filtered.length === 1 ? "" : "s"} found:`, ""];
      filtered.forEach((b, i) => {
        lines.push(`${i + 1}. ${b.label} — ${b.der.length} bytes${b.headers.length ? ` (${b.headers.join("; ")})` : ""}`);
        lines.push(`    sha256:  ${sha256(b.der)}`);
        if (b.label === "CERTIFICATE") lines.push(...describeCert(b));
      });
      return { output: lines.join("\n"), error: null };
    }
    case "extract": {
      const chosen = o.index === 0 ? filtered : [filtered[o.index - 1]];
      if (chosen.some((b) => !b)) return fail(`There are only ${filtered.length} matching block(s); choose 1–${filtered.length}.`);
      return { output: (chosen as PemBlock[]).map((b) => formatPem(b.label, b.der, o.lineWidth, eol, b.headers)).join(eol), error: null };
    }
    case "rewrap":
      return { output: filtered.map((b) => formatPem(b.label, b.der, o.lineWidth, eol, b.headers)).join(eol), error: null };
    case "strip":
      return { output: filtered.map((b) => b.base64).join(eol), error: null };
    case "reverse":
      return { output: [...filtered].reverse().map((b) => formatPem(b.label, b.der, o.lineWidth, eol, b.headers)).join(eol), error: null };
    case "dedupe": {
      const seen = new Set<string>();
      const kept = filtered.filter((b) => {
        const k = `${b.label}:${b.base64}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      return { output: kept.map((b) => formatPem(b.label, b.der, o.lineWidth, eol, b.headers)).join(eol), error: null };
    }
    case "to-der": {
      const chosen = o.index === 0 ? filtered : [filtered[o.index - 1]];
      if (chosen.some((b) => !b)) return fail(`There are only ${filtered.length} matching block(s); choose 1–${filtered.length}.`);
      const fmt = (b: PemBlock) => (o.derFormat === "hex" ? toHex(b.der) : o.derFormat === "hex-spaced" ? toHex(b.der).match(/../g)!.join(" ") : b.base64);
      return { output: (chosen as PemBlock[]).map(fmt).join(eol), error: null };
    }
  }
}

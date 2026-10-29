import type { TransformResult } from "@/lib/tool-transform";
import { base64ToBytes, bytesToBase64 } from "@/lib/byte-input";
import type { WebhookSignatureVerifierOptions } from "./schema";

const enc = new TextEncoder();
const HASH = { sha256: "SHA-256", sha1: "SHA-1", sha512: "SHA-512" } as const;

async function hmac(key: Uint8Array, data: string, algo: keyof typeof HASH = "sha256"): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", key as BufferSource, { name: "HMAC", hash: HASH[algo] }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(data)));
}
const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

interface Provider { header: string; needs: ("timestamp" | "id")[]; tolerance?: number; doc: string }
export const PROVIDERS: Record<WebhookSignatureVerifierOptions["provider"], Provider> = {
  github: { header: "X-Hub-Signature-256", needs: [], doc: "HMAC-SHA256 of the raw body, hex, prefixed sha256=" },
  stripe: { header: "Stripe-Signature", needs: ["timestamp"], tolerance: 300, doc: "HMAC-SHA256 of \"{t}.{body}\", hex, sent as t=...,v1=..." },
  slack: { header: "X-Slack-Signature", needs: ["timestamp"], tolerance: 300, doc: "HMAC-SHA256 of \"v0:{X-Slack-Request-Timestamp}:{body}\", hex, prefixed v0=" },
  razorpay: { header: "X-Razorpay-Signature", needs: [], doc: "HMAC-SHA256 of the raw body with the webhook secret, hex" },
  shopify: { header: "X-Shopify-Hmac-Sha256", needs: [], doc: "HMAC-SHA256 of the raw body, base64" },
  standard: { header: "webhook-signature", needs: ["id", "timestamp"], tolerance: 300, doc: "Standard Webhooks / Svix: HMAC-SHA256 of \"{webhook-id}.{webhook-timestamp}.{body}\" with the base64 secret after whsec_, sent as v1,<base64>" },
  generic: { header: "(your signature header)", needs: [], doc: "HMAC of the raw body" },
};

export interface Parsed { secret: string; signature: string; timestamp: string; id: string; body: string }

export function parseInput(input: string): Parsed {
  const sep = /\r?\n\r?\n/.exec(input);
  const head = sep ? input.slice(0, sep.index) : input;
  const body = sep ? input.slice(sep.index + sep[0].length) : "";
  const f = new Map<string, string>();
  for (const line of head.split(/\r?\n/)) { const m = /^\s*([\w-]+)\s*:\s?(.*)$/.exec(line); if (m) f.set(m[1]!.toLowerCase(), m[2]!.trim()); }
  return { secret: f.get("secret") ?? "", signature: f.get("signature") ?? "", timestamp: f.get("timestamp") ?? "", id: f.get("id") ?? "", body };
}

/** Returns the expected header value and the comparable signature parts. */
export async function expected(p: Parsed, o: WebhookSignatureVerifierOptions): Promise<{ header: string; candidates: string[]; timestamp?: number }> {
  const key = enc.encode(p.secret);
  switch (o.provider) {
    case "github": { const s = `sha256=${hex(await hmac(key, p.body))}`; return { header: s, candidates: [s] }; }
    case "razorpay": { const s = hex(await hmac(key, p.body)); return { header: s, candidates: [s] }; }
    case "shopify": { const s = bytesToBase64(await hmac(key, p.body)); return { header: s, candidates: [s] }; }
    case "slack": { const s = `v0=${hex(await hmac(key, `v0:${p.timestamp}:${p.body}`))}`; return { header: s, candidates: [s], timestamp: Number(p.timestamp) }; }
    case "stripe": {
      const t = p.timestamp || /(?:^|,)t=(\d+)/.exec(p.signature)?.[1] || "";
      const s = hex(await hmac(key, `${t}.${p.body}`));
      return { header: `t=${t},v1=${s}`, candidates: [s], timestamp: Number(t) };
    }
    case "standard": {
      const raw = p.secret.replace(/^whsec_/, "");
      const s = `v1,${bytesToBase64(await hmac(base64ToBytes(raw), `${p.id}.${p.timestamp}.${p.body}`))}`;
      return { header: s, candidates: [s], timestamp: Number(p.timestamp) };
    }
    case "generic": {
      const d = await hmac(key, p.body, o.algorithm);
      const s = o.encoding === "hex" ? hex(d) : bytesToBase64(d);
      return { header: s, candidates: [s] };
    }
  }
}

function provided(sig: string, provider: WebhookSignatureVerifierOptions["provider"]): string[] {
  if (provider === "stripe") return [...sig.matchAll(/(?:^|,)\s*v1=([0-9a-f]+)/gi)].map((m) => m[1]!.toLowerCase());
  if (provider === "standard") return sig.split(/\s+/).filter(Boolean);
  if (provider === "github" || provider === "slack") return [sig.trim().toLowerCase()];
  return [sig.trim()];
}

export async function runWebhookSignatureVerifier(input: string, options: WebhookSignatureVerifierOptions, now: Date = new Date()): Promise<TransformResult> {
  if (!input.trim()) return { output: "", error: null };
  const p = parseInput(input);
  const prov = PROVIDERS[options.provider];
  if (!p.secret) return { output: "", error: { message: "Add a \"secret:\" line, then a blank line, then the raw request body." } };
  if (options.provider === "stripe" && !p.timestamp && !/t=\d+/.test(p.signature)) return { output: "", error: { message: "Stripe needs the t= value: paste the full Stripe-Signature header as signature:, or add timestamp:." } };
  for (const need of prov.needs) if (need === "id" && !p.id) return { output: "", error: { message: "Standard Webhooks needs \"id:\" (the webhook-id header)." } };
  if (prov.needs.includes("timestamp") && options.provider !== "stripe" && !p.timestamp) return { output: "", error: { message: "Add \"timestamp:\" (the request timestamp header)." } };
  let exp: Awaited<ReturnType<typeof expected>>;
  try { exp = await expected(p, options); } catch (e) { return { output: "", error: { message: (e as Error).message } }; }
  const out = [`${prov.header}: ${exp.header}`, `(${prov.doc})`];
  if (p.signature) {
    const got = provided(p.signature, options.provider);
    const ok = got.some((g) => exp.candidates.some((c) => c.toLowerCase() === g.toLowerCase()));
    out.push("", ok ? "MATCH: the signature is valid for this body and secret." : "MISMATCH: the signature does not match.");
    if (!ok) {
      out.push("Common causes:", "  - the body was re-serialised (parsed JSON, changed whitespace or key order) instead of using the raw bytes", "  - a trailing newline was added or removed", "  - the test-mode secret was used for a live event, or vice versa", ...(options.provider === "standard" ? ["  - the secret must keep its whsec_ prefix, and the id/timestamp must come from the same request"] : []));
      if (p.body.endsWith("\n")) out.push("  Note: your body ends with a newline; check whether the sender included it.");
    }
  }
  if (exp.timestamp && prov.tolerance) {
    const age = Math.round(now.getTime() / 1000 - exp.timestamp);
    if (Number.isFinite(age)) out.push("", Math.abs(age) > prov.tolerance ? `Timestamp is ${age}s from now: outside the ${prov.tolerance}s tolerance, so a server should reject it as a possible replay.` : `Timestamp age ${age}s is within the ${prov.tolerance}s tolerance.`);
  }
  out.push("", "In code, compare signatures in constant time (MessageDigest.isEqual in Java, crypto.timingSafeEqual in Node, hmac.compare_digest in Python).");
  return { output: out.join("\n"), error: null };
}

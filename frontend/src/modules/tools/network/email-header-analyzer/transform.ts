import type { TransformResult } from "@/lib/tool-transform";
import type { EmailHeaderAnalyzerOptions } from "./schema";

export function parseHeaders(raw: string): [string, string][] {
  const text = raw.replace(/\r\n/g, "\n");
  const head = text.split(/\n\s*\n/)[0]!;
  const out: [string, string][] = [];
  for (const line of head.split("\n")) {
    if (/^[ \t]/.test(line) && out.length) { out[out.length - 1]![1] += ` ${line.trim()}`; continue; }
    const m = /^([!-9;-~]+):\s?(.*)$/.exec(line);
    if (m) out.push([m[1]!, m[2]!.trim()]);
  }
  return out;
}

export interface Hop { from: string; by: string; with: string; ip: string; date: Date | null; raw: string }

const stripComments = (s: string) => s.replace(/\([^()]*\)/g, "").replace(/\s+/g, " ").trim();
export function parseDate(s: string): Date | null {
  const t = Date.parse(stripComments(s).replace(/^[A-Za-z]{3},\s*/, ""));
  return Number.isNaN(t) ? null : new Date(t);
}

export function parseReceived(v: string): Hop {
  const semi = v.lastIndexOf(";");
  const body = semi >= 0 ? v.slice(0, semi) : v;
  const date = semi >= 0 ? parseDate(v.slice(semi + 1)) : null;
  const grab = (kw: string) => new RegExp(`\\b${kw}\\s+([^\\s;()]+)`, "i").exec(body)?.[1] ?? "";
  const ip = /\[(?:IPv6:)?([0-9a-fA-F:.]+)\]/.exec(body)?.[1] ?? /\(([0-9]{1,3}(?:\.[0-9]{1,3}){3})\)/.exec(body)?.[1] ?? "";
  return { from: grab("from"), by: grab("by"), with: grab("with"), ip, date, raw: v };
}

const domainOf = (addr: string) => (/@([A-Za-z0-9.-]+)/.exec(addr)?.[1] ?? "").toLowerCase().replace(/\.$/, "");
/** Approximates the organisational domain (last two labels, or three for common two-level suffixes). */
export const orgDomain = (d: string) => { const p = d.toLowerCase().split(".").filter(Boolean); const twoLevel = /^(co|com|net|org|gov|ac|edu)\.[a-z]{2}$/.test(p.slice(-2).join(".")); return p.slice(twoLevel ? -3 : -2).join("."); };

function fmtDelay(ms: number): string { const s = Math.round(ms / 1000); return s < 0 ? `${s}s (clock skew)` : s < 120 ? `${s}s` : s < 7200 ? `${Math.round(s / 60)} min` : `${(s / 3600).toFixed(1)} h`; }

export function runEmailHeaderAnalyzer(input: string, options: EmailHeaderAnalyzerOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  const headers = parseHeaders(input);
  if (!headers.length) return { output: "", error: { message: "No headers found. Paste the raw message source (Gmail: Show original; Outlook: View message source)." } };
  const all = (n: string) => headers.filter(([k]) => k.toLowerCase() === n.toLowerCase()).map(([, v]) => v);
  const one = (n: string) => all(n)[0];
  const out: string[] = [];
  const warn: string[] = [];

  const from = one("From") ?? "";
  const fromDomain = domainOf(from);
  out.push("Message");
  for (const n of ["From", "Reply-To", "Return-Path", "Sender", "To", "Subject", "Date", "Message-ID"]) { const v = one(n); if (v) out.push(`  ${n}: ${v}`); }

  const hops = all("Received").map(parseReceived).reverse();
  if (hops.length) {
    out.push("", `Delivery path (${hops.length} hop${hops.length === 1 ? "" : "s"}, oldest first)`);
    let prev: Date | null = null;
    hops.forEach((h, i) => {
      const delay = prev && h.date ? h.date.getTime() - prev.getTime() : null;
      out.push(`  ${i + 1}. ${h.from || "?"}${h.ip ? ` [${h.ip}]` : ""} -> ${h.by || "?"}${h.with ? ` (${h.with})` : ""}${h.date ? `  ${h.date.toISOString().replace(".000", "")}` : ""}${delay !== null ? `  +${fmtDelay(delay)}` : ""}`);
      if (delay !== null && delay > 5 * 60_000) warn.push(`Hop ${i + 1} took ${fmtDelay(delay)}: queueing, greylisting or a slow relay.`);
      if (h.date) prev = h.date;
    });
    const sent = parseDate(one("Date") ?? "");
    const first = hops[0]?.date, last = hops[hops.length - 1]?.date;
    if (sent && last) out.push(`  Total from Date header to final delivery: ${fmtDelay(last.getTime() - sent.getTime())}`);
    if (sent && first && first.getTime() - sent.getTime() < -10 * 60_000) warn.push("The Date header is later than the first Received hop: the sender's clock is wrong or the header was forged.");
  }

  const auth = all("Authentication-Results").join("; ");
  const result = (mech: string) => new RegExp(`\\b${mech}=(\\w+)`, "i").exec(auth)?.[1]?.toLowerCase();
  const spf = result("spf") ?? /^(\w+)/.exec(one("Received-SPF") ?? "")?.[1]?.toLowerCase();
  const dkim = result("dkim");
  const dmarc = result("dmarc");
  const arc = result("arc");
  const dkimSig = one("DKIM-Signature");
  const dkimD = dkimSig ? /\bd=([^;\s]+)/.exec(dkimSig)?.[1]?.toLowerCase() : /header\.d=([^;\s]+)/i.exec(auth)?.[1]?.toLowerCase();
  const dkimS = dkimSig ? /\bs=([^;\s]+)/.exec(dkimSig)?.[1] : undefined;
  const returnDomain = domainOf(one("Return-Path") ?? "") || /smtp\.mailfrom=([^;\s]+)/i.exec(auth)?.[1]?.replace(/^.*@/, "").toLowerCase() || "";

  out.push("", "Authentication");
  out.push(`  SPF:   ${spf ?? "not reported"}${returnDomain ? `  (envelope from ${returnDomain}${fromDomain ? `, ${orgDomain(returnDomain) === orgDomain(fromDomain) ? "aligned" : "NOT aligned"} with From` : ""})` : ""}`);
  out.push(`  DKIM:  ${dkim ?? (dkimSig ? "signature present, result not reported" : "no signature")}${dkimD ? `  (d=${dkimD}${dkimS ? `, selector ${dkimS}` : ""}${fromDomain ? `, ${orgDomain(dkimD) === orgDomain(fromDomain) ? "aligned" : "NOT aligned"} with From` : ""})` : ""}`);
  out.push(`  DMARC: ${dmarc ?? "not reported"}${/\bp=(\w+)/i.exec(auth) ? `  (policy ${/\bp=(\w+)/i.exec(auth)![1]})` : ""}`);
  if (arc) out.push(`  ARC:   ${arc}`);
  if (dmarc === "fail") warn.push("DMARC failed: the From domain is not authenticated. Treat this message as suspicious.");
  if (spf === "fail" || spf === "softfail") warn.push(`SPF ${spf}: the sending server is not authorised for the envelope domain.`);
  if (!dkimSig && !dkim) warn.push("No DKIM signature: content can be altered in transit and DMARC relies on SPF alone.");
  if (dkim === "fail") warn.push("DKIM failed: the message changed after signing, or the key does not match.");

  const replyTo = one("Reply-To");
  if (replyTo && fromDomain && orgDomain(domainOf(replyTo)) !== orgDomain(fromDomain)) warn.push(`Reply-To (${domainOf(replyTo)}) differs from From (${fromDomain}): replies go elsewhere, a common phishing trick.`);
  const msgId = one("Message-ID");
  if (msgId && fromDomain && domainOf(msgId) && orgDomain(domainOf(msgId)) !== orgDomain(fromDomain)) out.push(`  Message-ID domain ${domainOf(msgId)} differs from From (normal for ESPs such as SendGrid or SES).`);
  const unsub = one("List-Unsubscribe");
  if (unsub) out.push("", `List-Unsubscribe: ${unsub}${one("List-Unsubscribe-Post") ? "\n  One-click unsubscribe (RFC 8058) is enabled." : "\n  No List-Unsubscribe-Post header: Gmail and Yahoo require one-click unsubscribe for bulk senders."}`);
  const mailer = one("X-Mailer") ?? one("User-Agent");
  if (mailer) out.push(`Client: ${mailer}`);

  if (warn.length) out.push("", "Findings", ...warn.map((w) => `  ! ${w}`));
  if (options.showAllHeaders) out.push("", `All headers (${headers.length})`, ...headers.map(([k, v]) => `  ${k}: ${v}`));
  return { output: out.join("\n"), error: null };
}

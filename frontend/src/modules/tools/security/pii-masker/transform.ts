import type { TransformResult } from "@/lib/tool-transform";
import type { PiiMaskerOptions } from "./schema";

export function luhn(digits: string): boolean {
  let sum = 0, alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48;
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n; alt = !alt;
  }
  return sum % 10 === 0;
}

export function ibanValid(s: string): boolean {
  const t = s.replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(t)) return false;
  const r = (t.slice(4) + t.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rem = 0;
  for (const ch of r) rem = (rem * 10 + (ch.charCodeAt(0) - 48)) % 97;
  return rem === 1;
}

type Kind = "email" | "phone" | "card" | "ssn" | "ip" | "id" | "iban";
interface Rule { kind: Kind; flag: keyof PiiMaskerOptions; re: RegExp; ok?: (m: string) => boolean; partial: (m: string) => string }

const keepLast = (n: number) => (m: string) => {
  let seen = 0; const total = m.replace(/\D/g, "").length;
  return m.replace(/\d/g, (d) => (++seen > total - n ? d : "*"));
};

const RULES: Rule[] = [
  { kind: "email", flag: "email", re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
    partial: (m) => { const [u, d] = m.split("@"); return `${u![0]}${"*".repeat(Math.max(u!.length - 1, 1))}@${d}`; } },
  { kind: "iban", flag: "iban", re: /\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){2,7}(?: ?[A-Z0-9]{1,3})?\b/g, ok: ibanValid,
    partial: (m) => { const t = m.replace(/\s/g, ""); return t.slice(0, 4) + "*".repeat(t.length - 8) + t.slice(-4); } },
  { kind: "card", flag: "card", re: /\b\d(?:[ -]?\d){12,18}\b/g, ok: (m) => { const d = m.replace(/\D/g, ""); return d.length >= 13 && d.length <= 19 && luhn(d); },
    partial: keepLast(4) },
  { kind: "ssn", flag: "ssn", re: /\b\d{3}-\d{2}-\d{4}\b/g, ok: (m) => !/^(000|666|9)/.test(m) && m.slice(4, 6) !== "00" && m.slice(7) !== "0000",
    partial: keepLast(4) },
  { kind: "id", flag: "idNumbers", re: /\b[A-Z]{5}\d{4}[A-Z]\b/g, partial: (m) => m.slice(0, 2) + "*".repeat(6) + m.slice(-2) },
  { kind: "id", flag: "idNumbers", re: /\b\d{4} \d{4} \d{4}\b/g, partial: keepLast(4) },
  { kind: "ip", flag: "ip", re: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g,
    partial: (m) => m.split(".").slice(0, 2).join(".") + ".*.*" },
  { kind: "phone", flag: "phone", re: /(?<![\w.])(?:\+\d{1,3}[ -]?)?(?:\(\d{2,4}\)[ -]?|\d{2,4}[ -])\d{3,4}[ -]\d{3,4}(?!\w)|(?<![\w.])\+\d{10,14}(?!\w)/g,
    ok: (m) => { const n = m.replace(/\D/g, "").length; return n >= 9 && n <= 15; }, partial: keepLast(2) },
];

const LABEL: Record<Kind, string> = { email: "EMAIL", phone: "PHONE", card: "CARD", ssn: "SSN", ip: "IP", id: "ID", iban: "IBAN" };

export function maskPii(input: string, o: PiiMaskerOptions): TransformResult {
  const counts: Partial<Record<Kind, number>> = {};
  let text = input;
  // Placeholders protect earlier matches from later rules.
  const stash: string[] = [];
  for (const r of RULES) {
    if (!o[r.flag]) continue;
    text = text.replace(r.re, (m) => {
      if (r.ok && !r.ok(m)) { stash.push(m); return `\u0000${stash.length - 1}\u0000`; }
      counts[r.kind] = (counts[r.kind] ?? 0) + 1;
      const rep = o.style === "label" ? `[${LABEL[r.kind]}]` : o.style === "stars" ? m.replace(/[^\s]/g, "*") : r.partial(m);
      stash.push(rep);
      return `\u0000${stash.length - 1}\u0000`;
    });
  }
  text = text.replace(/\u0000(\d+)\u0000/g, (_, i) => stash[Number(i)]!);
  if (o.report) {
    const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);
    const lines = Object.entries(counts).map(([k, v]) => `${LABEL[k as Kind]}: ${v}`);
    text += `\n\n--- Report ---\n${total ? lines.join("\n") : "No PII found"}`;
  }
  return { output: text, error: null };
}

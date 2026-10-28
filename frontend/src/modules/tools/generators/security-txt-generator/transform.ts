import type { TransformResult } from "@/lib/tool-transform";
import type { SecurityTxtGeneratorOptions } from "./schema";

const FIELDS: Record<string, string> = { contact: "Contact", encryption: "Encryption", acknowledgments: "Acknowledgments", acknowledgements: "Acknowledgments", policy: "Policy", hiring: "Hiring", canonical: "Canonical", language: "Preferred-Languages", "preferred-languages": "Preferred-Languages", csaf: "CSAF" };

/** Input: `key: value` lines (contact, encryption, policy, hiring, canonical, acknowledgments, language, csaf). Expires is generated. */
export function generateSecurityTxt(input: string, o: SecurityTxtGeneratorOptions, now: Date = new Date()): TransformResult {
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  if (!lines.length) return { output: "", error: null };
  const out: string[] = [];
  let hasContact = false;
  for (const [i, l] of lines.entries()) {
    const m = /^([A-Za-z-]+)\s*[:=]\s*(.+)$/.exec(l);
    if (!m) return { output: "", error: { message: 'Expected "field: value"', line: i + 1 } };
    const field = FIELDS[m[1]!.toLowerCase()];
    if (!field) return { output: "", error: { message: `Unknown field "${m[1]}". Use: contact, encryption, policy, hiring, canonical, acknowledgments, language, csaf`, line: i + 1 } };
    let v = m[2]!.trim();
    if (field === "Contact" && !/^(https:\/\/|mailto:|tel:)/i.test(v)) v = v.includes("@") ? `mailto:${v}` : v;
    if (field === "Contact" && !/^(https:\/\/|mailto:|tel:)/i.test(v)) return { output: "", error: { message: "Contact must be an email, mailto:, tel: or https:// URI", line: i + 1 } };
    if (!["Preferred-Languages"].includes(field) && !/^(https:\/\/|mailto:|tel:)/i.test(v)) return { output: "", error: { message: `${field} must be an https:// URI`, line: i + 1 } };
    if (field === "Contact") hasContact = true;
    out.push(`${field}: ${v}`);
  }
  if (!hasContact) return { output: "", error: { message: "At least one Contact field is required (RFC 9116)" } };
  const base = o.baseDate ? new Date(o.baseDate) : now;
  if (Number.isNaN(base.getTime())) return { output: "", error: { message: "baseDate is not a valid date" } };
  const exp = new Date(base.getTime() + o.expiresInDays * 86_400_000);
  const canonical = out.filter((x) => x.startsWith("Canonical"));
  const rest = out.filter((x) => !x.startsWith("Canonical"));
  const res = [...rest, `Expires: ${exp.toISOString().replace(/\.\d{3}Z$/, "Z")}`, ...canonical];
  return { output: "# Serve at /.well-known/security.txt\n" + res.join("\n") + "\n", error: null };
}

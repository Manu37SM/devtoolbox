import type { TransformResult } from "@/lib/tool-transform";
import type { IsbnGtinValidatorOptions } from "./schema";

/** GS1 check digit for the digits *without* the check digit (works for GTIN-8/12/13/14). */
export function gs1CheckDigit(body: string): number {
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    const d = Number(body[body.length - 1 - i]);
    sum += d * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

export function isbn10CheckChar(body9: string): string {
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (10 - i) * Number(body9[i]);
  const c = (11 - (sum % 11)) % 11;
  return c === 10 ? "X" : String(c);
}

export function isbn10To13(isbn10: string): string {
  const body = "978" + isbn10.slice(0, 9);
  return body + gs1CheckDigit(body);
}

export function isbn13To10(isbn13: string): string | null {
  if (!isbn13.startsWith("978")) return null;
  const body = isbn13.slice(3, 12);
  return body + isbn10CheckChar(body);
}

export interface CodeReport { kind: string; valid: boolean; expected?: string; notes: string[] }

export function analyze(raw: string, convert: boolean): CodeReport {
  const code = raw.replace(/[\s-]/g, "").toUpperCase();
  if (!/^[0-9]{7,14}$|^[0-9]{9}[0-9X]$/.test(code)) throw new Error("Expected 8, 10, 12, 13 or 14 digits (ISBN-10 may end in X)");
  const notes: string[] = [];
  if (code.length === 10) {
    const exp = isbn10CheckChar(code.slice(0, 9));
    const valid = exp === code[9];
    if (valid && convert) notes.push(`ISBN-13: ${isbn10To13(code)}`);
    return { kind: "ISBN-10", valid, expected: valid ? undefined : exp, notes };
  }
  if (code.includes("X")) throw new Error("X is only valid as the last character of an ISBN-10");
  const kinds: Record<number, string> = { 8: "EAN-8", 12: "UPC-A", 13: "EAN-13", 14: "GTIN-14" };
  const kind = kinds[code.length];
  if (!kind) throw new Error(`${code.length} digits is not a supported length (8, 10, 12, 13, 14)`);
  const exp = String(gs1CheckDigit(code.slice(0, -1)));
  const valid = exp === code.slice(-1);
  let label = kind;
  if (code.length === 13 && /^97[89]/.test(code)) {
    label = "ISBN-13 (EAN-13, Bookland)";
    if (valid && convert) {
      const i10 = isbn13To10(code);
      notes.push(i10 ? `ISBN-10: ${i10}` : "No ISBN-10 equivalent (979 prefix)");
    }
  } else if (code.length === 13 && /^97[78]/.test(code.slice(0, 3))) label = "ISSN/ISMN-related EAN-13";
  if (code.length === 12 && valid && convert) notes.push(`EAN-13: 0${code}`);
  return { kind: label, valid, expected: valid ? undefined : exp, notes };
}

export function validateCodes(input: string, options: IsbnGtinValidatorOptions): TransformResult {
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  if (!lines.length) return { output: "", error: null };
  const out: string[] = [];
  let firstErr: { message: string; line?: number } | null = null;
  lines.forEach((l, i) => {
    try {
      const r = analyze(l, options.convertIsbn);
      const head = `${r.valid ? "✓" : "✗"} ${l}  ${r.kind}${r.valid ? "" : `  invalid check digit (expected ${r.expected})`}`;
      out.push([head, ...r.notes.map((n) => "    " + n)].join("\n"));
    } catch (e) {
      firstErr ??= { message: `Line ${i + 1}: ${(e as Error).message}`, line: i + 1 };
      out.push(`! ${l}  ${(e as Error).message}`);
    }
  });
  const ok = out.filter((o) => o.startsWith("✓")).length;
  out.push("", `${ok} of ${lines.length} valid`);
  return { output: out.join("\n"), error: firstErr };
}

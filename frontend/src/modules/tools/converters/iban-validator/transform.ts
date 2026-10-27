import type { TransformResult } from "@/lib/tool-transform";
import type { IbanValidatorOptions } from "./schema";

/** IBAN lengths from the SWIFT IBAN registry. */
export const IBAN_LENGTHS: Record<string, number> = {
  AD: 24, AE: 23, AL: 28, AT: 20, AZ: 28, BA: 20, BE: 16, BG: 22, BH: 22, BR: 29, BY: 28, CH: 21, CR: 22, CY: 28, CZ: 24,
  DE: 22, DK: 18, DO: 28, EE: 20, EG: 29, ES: 24, FI: 18, FO: 18, FR: 27, GB: 22, GE: 22, GI: 23, GL: 18, GR: 27, GT: 28,
  HR: 21, HU: 28, IE: 22, IL: 23, IQ: 23, IS: 26, IT: 27, JO: 30, KW: 30, KZ: 20, LB: 28, LC: 32, LI: 21, LT: 20, LU: 20,
  LV: 21, MC: 27, MD: 24, ME: 22, MK: 19, MR: 27, MT: 31, MU: 30, NL: 18, NO: 15, PK: 24, PL: 28, PS: 29, PT: 25, QA: 29,
  RO: 24, RS: 22, SA: 24, SC: 31, SE: 24, SI: 19, SK: 24, SM: 27, ST: 25, SV: 28, TL: 23, TN: 24, TR: 26, UA: 29, VA: 22,
  VG: 24, XK: 20,
};

export function mod97(iban: string): number {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const digits = /[A-Z]/.test(ch) ? String(ch.charCodeAt(0) - 55) : ch;
    for (const d of digits) remainder = (remainder * 10 + Number(d)) % 97;
  }
  return remainder;
}

export function checkDigits(country: string, bban: string): string {
  const r = mod97(`${country}00${bban}`);
  return String(98 - r).padStart(2, "0");
}

export interface IbanReport {
  valid: boolean;
  problem?: string;
  compact: string;
  country: string;
  checkDigits: string;
  bban: string;
  expectedLength?: number;
}

export function validateIban(raw: string): IbanReport {
  const compact = raw.replace(/\s+/g, "").toUpperCase();
  const report: IbanReport = { valid: false, compact, country: compact.slice(0, 2), checkDigits: compact.slice(2, 4), bban: compact.slice(4) };
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(compact)) return { ...report, problem: "Must start with a 2-letter country code and 2 check digits, followed by letters/digits only." };
  const expected = IBAN_LENGTHS[report.country];
  if (expected === undefined) return { ...report, problem: `"${report.country}" is not a country in the IBAN registry.` };
  report.expectedLength = expected;
  if (compact.length !== expected) return { ...report, problem: `${report.country} IBANs are ${expected} characters; this one has ${compact.length}.` };
  if (mod97(compact) !== 1) return { ...report, problem: `Check digits are wrong (they should be ${checkDigits(report.country, report.bban)}).` };
  return { ...report, valid: true };
}

export const groupIban = (compact: string) => compact.replace(/(.{4})/g, "$1 ").trim();

export function convertIban(input: string, options: IbanValidatorOptions): TransformResult {
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { output: "", error: null };
  const blocks = lines.map((line) => {
    const r = validateIban(line);
    const shown = options.format === "grouped" ? groupIban(r.compact) : r.compact;
    if (!r.valid) return `✗ ${shown}\n    ${r.problem}`;
    return `✓ ${shown}\n    country ${r.country} · check digits ${r.checkDigits} · BBAN ${r.bban} (${r.compact.length} characters)`;
  });
  return { output: blocks.join("\n\n"), error: null };
}

import type { TransformResult } from "@/lib/tool-transform";
import type { IndianNumberSystemConverterOptions } from "./schema";

/** Works on digit strings (BigInt) so large rupee amounts never lose precision. */
export function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${rest},${last3}`;
}

export function groupInternational(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function below100(n: number): string {
  if (n < 20) return ONES[n]!;
  return TENS[Math.floor(n / 10)]! + (n % 10 ? `-${ONES[n % 10]}` : "");
}

function below1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return [h ? `${ONES[h]} hundred` : "", r ? below100(r) : ""].filter(Boolean).join(" ");
}

export function indianWords(n: bigint): string {
  if (n === 0n) return "zero";
  const units: [bigint, string][] = [[10n ** 7n, "crore"], [10n ** 5n, "lakh"], [1000n, "thousand"]];
  let rest = n;
  const parts: string[] = [];
  // Crores can themselves exceed 99, so they are expressed recursively ("one hundred crore")
  const crores = rest / units[0]![0];
  if (crores > 0n) {
    parts.push(`${crores >= 1000n ? indianWords(crores) : below1000(Number(crores))} crore`);
    rest %= units[0]![0];
  }
  for (const [size, name] of units.slice(1)) {
    const q = rest / size;
    if (q > 0n) { parts.push(`${below100(Number(q))} ${name}`); rest %= size; }
  }
  if (rest > 0n) parts.push(below1000(Number(rest)));
  return parts.join(" ");
}

export function convertIndianNumber(input: string, options: IndianNumberSystemConverterOptions): TransformResult {
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { output: "", error: null };
  const out: string[] = [];
  for (const [i, line] of lines.entries()) {
    const cleaned = line.replace(/^(-?)[₹$]/, "$1").replace(/[,\s_]/g, "");
    const m = /^(-?)(\d+)(?:\.(\d+))?$/.exec(cleaned);
    if (!m) return { output: "", error: { message: "Enter a plain number, e.g. 12345678 or 1,23,45,678.50", line: i + 1 } };
    const [, neg, whole, frac] = m;
    const w = whole!.replace(/^0+(?=\d)/, "");
    const fracPart = frac ? `.${frac}` : "";
    const rows = [
      `${line}`,
      `  Indian         ${neg}${groupIndian(w)}${fracPart}`,
      `  International  ${neg}${groupInternational(w)}${fracPart}`,
    ];
    const big = BigInt(w);
    if (options.words) {
      let words = `${neg ? "minus " : ""}${indianWords(big)}`;
      if (frac) words += ` point ${[...frac].map((d) => (d === "0" ? "zero" : ONES[Number(d)])).join(" ")}`;
      rows.push(`  Words          ${words}`);
    }
    if (options.shorthand) {
      const lakh = Number(`${w}${fracPart}`) / 1e5;
      const crore = Number(`${w}${fracPart}`) / 1e7;
      rows.push(`  In lakh/crore  ${Number(lakh.toPrecision(10))} lakh · ${Number(crore.toPrecision(10))} crore`);
    }
    out.push(rows.join("\n"));
  }
  return { output: out.join("\n\n"), error: null };
}

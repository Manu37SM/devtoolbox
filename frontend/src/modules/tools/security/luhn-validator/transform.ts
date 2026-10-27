import type { TransformResult } from "@/lib/tool-transform";
import type { LuhnValidatorOptions } from "./schema";

export function luhnCheck(digits: string): boolean {
  if (!/^\d+$/.test(digits)) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

export function luhnCheckDigit(partial: string): number {
  for (let d = 0; d <= 9; d++) if (luhnCheck(partial + d)) return d;
  throw new Error("unreachable");
}

interface Brand { id: string; name: string; test: RegExp; lengths: number[]; prefix: string }
const BRANDS: Brand[] = [
  { id: "visa", name: "Visa", test: /^4/, lengths: [13, 16, 19], prefix: "4" },
  { id: "mastercard", name: "Mastercard", test: /^(5[1-5]|2(2[2-9]\d|[3-6]\d\d|7[01]\d|720))/, lengths: [16], prefix: "5" },
  { id: "amex", name: "American Express", test: /^3[47]/, lengths: [15], prefix: "34" },
  { id: "discover", name: "Discover", test: /^(6011|64[4-9]|622[1-9])/, lengths: [16, 17, 18, 19], prefix: "6011" },
  { id: "diners", name: "Diners Club", test: /^(30[0-5]|3095|36|3[89])/, lengths: [14, 15, 16, 17, 18, 19], prefix: "36" },
  { id: "jcb", name: "JCB", test: /^35(2[89]|[3-8]\d)/, lengths: [16, 17, 18, 19], prefix: "3528" },
  { id: "unionpay", name: "UnionPay", test: /^62/, lengths: [16, 17, 18, 19], prefix: "6200" },
  { id: "rupay", name: "RuPay / Discover (shared ranges)", test: /^(508|60|65|81|82)/, lengths: [16], prefix: "508" },
];

export function detectBrand(digits: string): Brand | undefined {
  return BRANDS.find((b) => b.test.test(digits));
}

const mask = (digits: string) => digits.replace(/\d(?=\d{4})/g, "•").replace(/(.{4})/g, "$1 ").trim();
const group = (digits: string) => digits.replace(/(.{4})/g, "$1 ").trim();

export function generateLuhn(brandId: LuhnValidatorOptions["brand"], rand: (n: number) => number = (n) => Math.floor((crypto.getRandomValues(new Uint32Array(1))[0]! / 2 ** 32) * n)): string {
  const brand = BRANDS.find((b) => b.id === brandId) ?? BRANDS[0]!;
  const length = brand.id === "amex" ? 15 : brand.id === "diners" ? 14 : 16;
  let prefix = brand.prefix;
  if (brand.id === "mastercard") prefix = String(51 + rand(5));
  if (brand.id === "amex") prefix = rand(2) === 0 ? "34" : "37";
  let body = prefix;
  while (body.length < length - 1) body += rand(10);
  return body + luhnCheckDigit(body);
}

export function checkLuhn(input: string, options: LuhnValidatorOptions, _nonce = 0): TransformResult {
  if (options.mode === "generate") {
    const count = Math.max(1, Math.min(50, Math.floor(options.count)));
    return { output: Array.from({ length: count }, () => group(generateLuhn(options.brand))).join("\n"), error: null };
  }
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { output: "", error: null };
  const out = lines.map((line) => {
    const digits = line.replace(/[\s-]/g, "");
    const shown = options.mask ? mask(digits) : group(digits);
    if (!/^\d{8,19}$/.test(digits)) return `✗ ${shown || line}\n    Expected 8–19 digits (spaces and dashes are ignored).`;
    const brand = detectBrand(digits);
    if (!luhnCheck(digits)) return `✗ ${shown}\n    Fails the Luhn check — a digit is wrong or transposed (the last digit should be ${luhnCheckDigit(digits.slice(0, -1))}).`;
    const lengthNote = brand && !brand.lengths.includes(digits.length) ? ` · unusual length for ${brand.name} (${brand.lengths.join("/")})` : "";
    return `✓ ${shown}\n    Luhn OK · ${brand ? brand.name : "unknown network"} · ${digits.length} digits${lengthNote}`;
  });
  return { output: out.join("\n\n"), error: null };
}

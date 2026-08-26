import type { NumberBase } from "./schema";

export interface NumberBaseResult {
  binary: string;
  octal: string;
  decimal: string;
  hex: string;
  error: string | null;
}

const DIGIT_PATTERN: Record<NumberBase, RegExp> = {
  2: /^[01]+$/,
  8: /^[0-7]+$/,
  10: /^[0-9]+$/,
  16: /^[0-9a-fA-F]+$/,
};

export function convertNumberBase(input: string, fromBase: NumberBase): NumberBaseResult {
  const empty: NumberBaseResult = { binary: "", octal: "", decimal: "", hex: "", error: null };
  const trimmed = input.trim();
  if (trimmed.length === 0) return empty;

  const negative = trimmed.startsWith("-");
  const unsigned = negative ? trimmed.slice(1) : trimmed;

  if (!DIGIT_PATTERN[fromBase].test(unsigned)) {
    return { ...empty, error: `"${input}" is not a valid base-${fromBase} number.` };
  }

  try {
    const prefix = { 2: "0b", 8: "0o", 10: "", 16: "0x" }[fromBase];
    const value = BigInt(`${prefix}${unsigned}`) * (negative ? -1n : 1n);
    const abs = value < 0n ? -value : value;
    const sign = value < 0n ? "-" : "";
    return {
      binary: sign + abs.toString(2),
      octal: sign + abs.toString(8),
      decimal: value.toString(10),
      hex: sign + abs.toString(16),
      error: null,
    };
  } catch {
    return { ...empty, error: "Could not parse this number." };
  }
}

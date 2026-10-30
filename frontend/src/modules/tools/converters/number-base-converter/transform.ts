import type { NumberBase, NumberBaseOptions } from "./schema";

export interface NumberBaseResult {
  binary: string;
  octal: string;
  decimal: string;
  hex: string;
  /** With a bit width: the same bits read as a two's complement signed number. */
  signed?: string;
  error: string | null;
}

const DIGIT_PATTERN: Record<NumberBase, RegExp> = {
  2: /^[01]+$/,
  8: /^[0-7]+$/,
  10: /^[0-9]+$/,
  16: /^[0-9a-fA-F]+$/,
};

const PREFIX: Record<NumberBase, RegExp> = { 2: /^0b/i, 8: /^0o/i, 10: /^$/, 16: /^0x/i };

function group(digits: string, size: number, sep: string): string {
  const out: string[] = [];
  for (let end = digits.length; end > 0; end -= size) out.unshift(digits.slice(Math.max(0, end - size), end));
  return out.join(sep);
}

export function convertNumberBase(input: string, fromBase: NumberBase, options: Partial<NumberBaseOptions> = {}): NumberBaseResult {
  const empty: NumberBaseResult = { binary: "", octal: "", decimal: "", hex: "", error: null };
  // Accept common spellings: 0xFF, 0b1010, 1_000_000, "ff ff", 1,000.
  const trimmed = input.trim().replace(/[\s_]/g, "").replace(fromBase === 10 ? /,/g : /$^/, "");
  if (trimmed.length === 0) return empty;

  const negative = trimmed.startsWith("-");
  const unsigned = (negative ? trimmed.slice(1) : trimmed).replace(PREFIX[fromBase], "");

  if (!DIGIT_PATTERN[fromBase].test(unsigned)) {
    return { ...empty, error: `"${input.trim()}" is not a valid base-${fromBase} number.` };
  }

  try {
    const prefix = { 2: "0b", 8: "0o", 10: "", 16: "0x" }[fromBase];
    let value = BigInt(`${prefix}${unsigned}`) * (negative ? -1n : 1n);
    const width = options.bitWidth && options.bitWidth !== "none" ? BigInt(options.bitWidth) : null;
    let signed: string | undefined;
    if (width !== null) {
      const modulus = 1n << width;
      const min = -(modulus >> 1n);
      if (value < min || value >= modulus) {
        return { ...empty, error: `${value} does not fit in ${width} bits (range ${min} to ${modulus - 1n}).` };
      }
      if (value < 0n) value += modulus; // two's complement bit pattern
      signed = (value >= modulus >> 1n ? value - modulus : value).toString(10);
    }
    const abs = value < 0n ? -value : value;
    const sign = value < 0n ? "-" : "";
    const pad = (digits: string, bitsPerDigit: number) =>
      width !== null && bitsPerDigit > 0 ? digits.padStart(Math.ceil(Number(width) / bitsPerDigit), "0") : digits;
    let bin = pad(abs.toString(2), 1);
    let oct = abs.toString(8);
    let dec = value.toString(10).replace("-", "");
    let hex = pad(abs.toString(16), 4);
    if (options.uppercase) hex = hex.toUpperCase();
    if (options.grouping) {
      bin = group(bin, 4, " ");
      oct = group(oct, 3, " ");
      dec = group(dec, 3, ",");
      hex = group(hex, 2, " ");
    }
    const p = options.prefixes;
    return {
      binary: sign + (p ? "0b" : "") + bin,
      octal: sign + (p ? "0o" : "") + oct,
      decimal: (value < 0n ? "-" : "") + dec,
      hex: sign + (p ? "0x" : "") + hex,
      ...(signed !== undefined ? { signed: options.grouping ? signed.replace(/\d+/, (d) => group(d, 3, ",")) : signed } : {}),
      error: null,
    };
  } catch {
    return { ...empty, error: "Could not parse this number." };
  }
}

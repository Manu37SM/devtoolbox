import type { TransformResult } from "@/lib/tool-transform";
import type { NumberToWordsOptions } from "./schema";

const SMALL = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const SCALES = ["", "thousand", "million", "billion", "trillion", "quadrillion", "quintillion"];

/** Largest magnitude supported: below 10^21 (i.e. up to "quintillions"). */
const LIMIT = 10n ** 21n;

const ORDINAL_IRREGULAR: Record<string, string> = {
  one: "first", two: "second", three: "third", five: "fifth", eight: "eighth", nine: "ninth", twelve: "twelfth",
};

function chunkToWords(n: number, useAnd: boolean, hasHigherChunks: boolean): string {
  const parts: string[] = [];
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (hundreds > 0) parts.push(`${SMALL[hundreds]} hundred`);
  if (rest > 0) {
    if (hundreds > 0 && useAnd) parts.push("and");
    else if (hundreds === 0 && useAnd && hasHigherChunks) parts.push("and");
    if (rest < 20) parts.push(SMALL[rest]!);
    else {
      const t = TENS[Math.floor(rest / 10)]!;
      const o = rest % 10;
      parts.push(o === 0 ? t : `${t}-${SMALL[o]}`);
    }
  }
  return parts.join(" ");
}

export function integerToWords(value: bigint, useAnd = false): string {
  if (value === 0n) return "zero";
  const negative = value < 0n;
  let n = negative ? -value : value;
  if (n >= LIMIT) throw new Error("Numbers of 10^21 or more are not supported.");

  const chunks: number[] = [];
  while (n > 0n) {
    chunks.push(Number(n % 1000n));
    n /= 1000n;
  }

  const words: string[] = [];
  for (let i = chunks.length - 1; i >= 0; i--) {
    const chunk = chunks[i]!;
    if (chunk === 0) continue;
    // British "and" before a trailing sub-hundred group: "one thousand and five".
    const needsLeadingAnd = useAnd && i === 0 && chunk < 100 && chunks.length > 1;
    const text = chunkToWords(chunk, useAnd, needsLeadingAnd);
    words.push(i > 0 ? `${text} ${SCALES[i]}` : text);
  }
  return (negative ? "negative " : "") + words.join(" ");
}

export function wordsToOrdinal(words: string): string {
  const match = /^(.*?)([a-z]+)$/.exec(words);
  if (!match) return words;
  const [, prefix, last] = match as unknown as [string, string, string];
  let ordinal: string;
  if (ORDINAL_IRREGULAR[last]) ordinal = ORDINAL_IRREGULAR[last]!;
  else if (last.endsWith("y")) ordinal = `${last.slice(0, -1)}ieth`;
  else ordinal = `${last}th`;
  return prefix + ordinal;
}

export function numberStringToWords(input: string, options: Pick<NumberToWordsOptions, "style" | "useAnd">): string {
  const cleaned = input.trim().replace(/[,_\s]/g, "");
  const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(cleaned);
  if (!match) throw new Error(`"${input.trim()}" is not a valid number.`);
  const [, sign, intPart, fraction] = match as unknown as [string, string, string, string | undefined];

  const value = BigInt(intPart) * (sign === "-" ? -1n : 1n);
  const isNegativeZero = sign === "-" && value === 0n && fraction !== undefined;
  let words = integerToWords(value, options.useAnd);
  if (isNegativeZero) words = "negative zero";

  if (fraction !== undefined) {
    if (options.style === "ordinal") throw new Error("Ordinal style only applies to whole numbers.");
    words += ` point ${Array.from(fraction).map((d) => SMALL[Number(d)]).join(" ")}`;
    return words;
  }
  return options.style === "ordinal" ? wordsToOrdinal(words) : words;
}

const WORD_VALUES: Record<string, number> = Object.fromEntries([
  ...SMALL.map((w, i) => [w, i] as const),
  ...TENS.map((w, i) => [w, i * 10] as const).filter(([w]) => w !== ""),
]);
const SCALE_VALUES: Record<string, bigint> = Object.fromEntries(
  SCALES.map((w, i) => [w, 1000n ** BigInt(i)] as const).filter(([w]) => w !== ""),
);

export function wordsToNumberString(input: string): string {
  const tokens = input
    .toLowerCase()
    .replace(/[,]/g, " ")
    .replace(/-/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0 && t !== "and");
  if (tokens.length === 0) return "";

  let negative = false;
  if (tokens[0] === "negative" || tokens[0] === "minus") {
    negative = true;
    tokens.shift();
  }

  const pointIndex = tokens.indexOf("point");
  const wholeTokens = pointIndex === -1 ? tokens : tokens.slice(0, pointIndex);
  const fractionTokens = pointIndex === -1 ? [] : tokens.slice(pointIndex + 1);
  if (wholeTokens.length === 0) throw new Error("Nothing to parse before “point”.");

  let total = 0n;
  let current = 0n;
  for (const token of wholeTokens) {
    if (token in WORD_VALUES) {
      current += BigInt(WORD_VALUES[token]!);
    } else if (token === "hundred") {
      current = (current === 0n ? 1n : current) * 100n;
    } else if (token in SCALE_VALUES) {
      total += (current === 0n ? 1n : current) * SCALE_VALUES[token]!;
      current = 0n;
    } else {
      throw new Error(`Unrecognised number word: "${token}".`);
    }
  }
  const whole = total + current;
  if (whole >= LIMIT) throw new Error("Numbers of 10^21 or more are not supported.");

  let digits = whole.toString();
  if (pointIndex !== -1) {
    if (fractionTokens.length === 0) throw new Error("Expected digit words after “point”.");
    const fractionDigits = fractionTokens.map((t) => {
      const v = WORD_VALUES[t];
      if (v === undefined || v > 9) throw new Error(`After “point”, expected single digit words — got "${t}".`);
      return String(v);
    });
    digits += `.${fractionDigits.join("")}`;
  }
  return negative && Number(digits) !== 0 ? `-${digits}` : digits;
}

export function convertNumberWords(input: string, options: NumberToWordsOptions): TransformResult {
  if (input.trim().length === 0) return { output: "", error: null };
  try {
    return {
      output: options.mode === "to-words" ? numberStringToWords(input, options) : wordsToNumberString(input),
      error: null,
    };
  } catch (e) {
    return { output: "", error: { message: e instanceof Error ? e.message : "Could not convert input." } };
  }
}

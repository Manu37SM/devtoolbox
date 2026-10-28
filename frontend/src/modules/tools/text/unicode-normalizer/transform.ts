import type { TransformResult } from "@/lib/tool-transform";
import type { UnicodeNormalizerOptions } from "./schema";

// Zero-width and bidi control characters that are invisible but change string equality.
const INVISIBLE = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF\u00AD]/g;

export function runUnicodeNormalizer(input: string, o: UnicodeNormalizerOptions): TransformResult {
  let s = input;
  if (o.removeInvisible) s = s.replace(INVISIBLE, "");
  s = s.normalize(o.form);
  if (o.stripDiacritics) s = s.normalize("NFD").replace(/\p{M}+/gu, "").normalize(o.form);
  if (o.straightenQuotes) {
    s = s.replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'").replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
      .replace(/[\u2013\u2014\u2212]/g, "-").replace(/\u2026/g, "...");
  }
  if (o.collapseSpaces) s = s.replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, " ").replace(/[ \t]{2,}/g, " ");
  return { output: s, error: null };
}

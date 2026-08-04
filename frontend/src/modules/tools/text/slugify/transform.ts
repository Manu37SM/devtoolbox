import type { SlugifyOptions } from "./schema";

export interface SlugifyResult {
  output: string;
  error: { message: string } | null;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function slugifyLine(line: string, options: SlugifyOptions): string {
  let value = line;

  if (options.transliterate) {
    value = value.normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  if (options.lowercase) {
    value = value.toLowerCase();
  }

  const sep = options.separator;
  const escapedSep = escapeRegExp(sep);

  // Replace anything that isn't a letter, digit, or the chosen separator
  // with the separator itself.
  const nonAllowedRe = new RegExp(`[^a-zA-Z0-9${escapedSep}]+`, "g");
  value = value.replace(nonAllowedRe, sep);

  // Collapse consecutive separators.
  const collapseRe = new RegExp(`${escapedSep}{2,}`, "g");
  value = value.replace(collapseRe, sep);

  // Trim leading/trailing separators.
  const trimRe = new RegExp(`^${escapedSep}+|${escapedSep}+$`, "g");
  value = value.replace(trimRe, "");

  if (options.maxLength !== undefined && value.length > options.maxLength) {
    value = value.slice(0, options.maxLength);
    // Avoid cutting mid-separator-run: trim any trailing separator left
    // over from truncation.
    value = value.replace(trimRe, "");
  }

  return value;
}

export function slugify(input: string, options: SlugifyOptions): SlugifyResult {
  if (input.length === 0) return { output: "", error: null };

  try {
    const lines = input.split("\n").map((line) => slugifyLine(line, options));
    return { output: lines.join("\n"), error: null };
  } catch (err) {
    return { output: "", error: { message: err instanceof Error ? err.message : "Slugify failed" } };
  }
}

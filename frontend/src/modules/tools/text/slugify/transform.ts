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

  const nonAllowedRe = new RegExp(`[^a-zA-Z0-9${escapedSep}]+`, "g");
  value = value.replace(nonAllowedRe, sep);

  const collapseRe = new RegExp(`${escapedSep}{2,}`, "g");
  value = value.replace(collapseRe, sep);

  const trimRe = new RegExp(`^${escapedSep}+|${escapedSep}+$`, "g");
  value = value.replace(trimRe, "");

  if (options.maxLength !== undefined && value.length > options.maxLength) {
    value = value.slice(0, options.maxLength);

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

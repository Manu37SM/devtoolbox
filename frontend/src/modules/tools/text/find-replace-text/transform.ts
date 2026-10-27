import type { TransformResult } from "@/lib/tool-transform";
import type { FindReplaceTextOptions } from "./schema";

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function findReplace(input: string, options: FindReplaceTextOptions): TransformResult {
  if (input.length === 0 || options.find.length === 0) return { output: input, error: null };

  let source = options.useRegex ? options.find : escapeRegex(options.find);
  if (options.wholeWord) source = `\\b(?:${source})\\b`;
  const flags = `g${options.caseSensitive ? "" : "i"}${options.useRegex ? "m" : ""}`;

  let pattern: RegExp;
  try {
    pattern = new RegExp(source, flags);
  } catch (e) {
    return { output: "", error: { message: `Invalid regular expression: ${e instanceof Error ? e.message : String(e)}` } };
  }
  // In plain mode the replacement is literal ($& etc. must not be interpreted).
  const replacement = options.useRegex ? options.replace : options.replace.replace(/\$/g, "$$$$");
  return { output: input.replace(pattern, replacement), error: null };
}

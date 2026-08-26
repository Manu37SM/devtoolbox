import type { HtmlEntityOptions } from "./schema";
import type { TransformResult } from "@/lib/tool-transform";

const NAMED_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const NAMED_DECODE: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

export function transformHtmlEntity(input: string, options: HtmlEntityOptions): TransformResult {
  if (input.length === 0) return { output: "", error: null };

  if (options.mode === "encode") {
    return { output: encode(input, options.encodeAllNonAscii), error: null };
  }

  try {
    return { output: decode(input), error: null };
  } catch (err) {
    return {
      output: "",
      error: { message: err instanceof Error ? err.message : "Invalid HTML entity" },
    };
  }
}

function encode(input: string, encodeAllNonAscii: boolean): string {
  let output = "";
  for (const char of input) {
    if (NAMED_ENTITIES[char]) {
      output += NAMED_ENTITIES[char];
    } else if (encodeAllNonAscii && char.codePointAt(0)! > 127) {
      output += `&#${char.codePointAt(0)};`;
    } else {
      output += char;
    }
  }
  return output;
}

function decode(input: string): string {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, ref: string) => {
    if (ref.startsWith("#x") || ref.startsWith("#X")) {
      return String.fromCodePoint(parseInt(ref.slice(2), 16));
    }
    if (ref.startsWith("#")) {
      return String.fromCodePoint(parseInt(ref.slice(1), 10));
    }
    return NAMED_DECODE[ref] ?? match;
  });
}

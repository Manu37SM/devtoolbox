import type { TransformResult } from "@/lib/tool-transform";
import type { TextCleanerOptions } from "./schema";

const INVISIBLE = /[\u200B-\u200D\u2060\uFEFF\u00AD]/g;

export function cleanText(input: string, options: TextCleanerOptions): TransformResult {
  if (input.length === 0) return { output: "", error: null };
  let text = input.replace(/\r\n?/g, "\n");

  if (options.removeInvisible) text = text.replace(INVISIBLE, "").replace(/[\u00A0\u2007\u202F]/g, " ");
  if (options.stripHtml) {
    text = text
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }
  if (options.removeAccents) text = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").normalize("NFC");
  if (options.straightenQuotes) {
    text = text
      .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
      .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/\u2026/g, "...");
  }
  if (options.collapseSpaces) text = text.replace(/[^\S\n]+/g, " ");
  if (options.trimLines) text = text.split("\n").map((l) => l.trim()).join("\n");
  if (options.removeEmptyLines) text = text.split("\n").filter((l) => l.trim() !== "").join("\n");
  else if (options.collapseEmptyLines) text = text.replace(/\n{3,}/g, "\n\n");

  return { output: text, error: null };
}

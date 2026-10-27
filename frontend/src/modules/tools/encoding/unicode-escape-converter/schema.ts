import { z } from "zod";

export const unicodeEscapeFormatSchema = z.enum(["js", "es6", "codepoint", "html-hex", "html-dec"]);
export type UnicodeEscapeFormat = z.infer<typeof unicodeEscapeFormatSchema>;

export const unicodeEscapeOptionsSchema = z.object({
  mode: z.enum(["escape", "unescape"]).default("escape"),
  format: unicodeEscapeFormatSchema.default("js"),
  escapeAscii: z.boolean().default(false),
});
export type UnicodeEscapeOptions = z.infer<typeof unicodeEscapeOptionsSchema>;

export const unicodeEscapeInputSchema = z.string().max(1_000_000);

import { z } from "zod";

export const mimeEncodedWordOptionsSchema = z.object({
  mode: z.enum(["qp-encode", "qp-decode", "word-encode", "word-decode"]).default("word-encode"),
  /** Character set the text is converted to (encode) or read from (decode) */
  charset: z.string().max(40).default("utf-8"),
  /** RFC 2047 encoding: Q, B (base64) or whichever is shorter */
  wordEncoding: z.enum(["auto", "Q", "B"]).default("auto"),
  /** Encode even plain-ASCII text (word-encode) */
  forceEncode: z.boolean().default(false),
  /** Separator between the pieces of a long encoded header */
  wordSeparator: z.enum(["space", "fold"]).default("space"),
  /** quoted-printable line limit; 0 disables soft line breaks */
  lineLength: z.number().int().min(0).max(998).default(76),
  eol: z.enum(["crlf", "lf"]).default("lf"),
  /** Encode every non-alphanumeric character (useful for headers) */
  encodeAll: z.boolean().default(false),
});
export type MimeEncodedWordOptions = z.infer<typeof mimeEncodedWordOptionsSchema>;

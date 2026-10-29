import { z } from "zod";

export const urlEncodeOptionsSchema = z.object({
  mode: z.enum(["encode", "decode"]).default("encode"),
  component: z.boolean().default(true),
  /** application/x-www-form-urlencoded: spaces as "+" when encoding, "+" read as a space when decoding. */
  formEncoding: z.boolean().default(false),
  /** Treat each line separately; an error names the line. */
  perLine: z.boolean().default(false),
});
export type UrlEncodeOptions = z.infer<typeof urlEncodeOptionsSchema>;

export const urlEncodeInputSchema = z.string().max(1_000_000);

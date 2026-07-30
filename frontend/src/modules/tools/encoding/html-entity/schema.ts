import { z } from "zod";

export const htmlEntityOptionsSchema = z.object({
  mode: z.enum(["encode", "decode"]).default("encode"),
  encodeAllNonAscii: z.boolean().default(false),
});
export type HtmlEntityOptions = z.infer<typeof htmlEntityOptionsSchema>;

export const htmlEntityInputSchema = z.string().max(1_000_000);

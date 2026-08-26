import { z } from "zod";

export const urlEncodeOptionsSchema = z.object({
  mode: z.enum(["encode", "decode"]).default("encode"),
  component: z.boolean().default(true),
});
export type UrlEncodeOptions = z.infer<typeof urlEncodeOptionsSchema>;

export const urlEncodeInputSchema = z.string().max(1_000_000);

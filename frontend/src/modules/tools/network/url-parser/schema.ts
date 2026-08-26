import { z } from "zod";

export const urlParserOptionsSchema = z.object({
  decodeComponents: z.boolean().default(true),
});

export type UrlParserOptions = z.infer<typeof urlParserOptionsSchema>;

export const urlParserInputSchema = z.string().max(20_000, {
  message: "Input exceeds the 20,000 character processing limit.",
});

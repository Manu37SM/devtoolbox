import { z } from "zod";

export const utmLinkBuilderOptionsSchema = z.object({
  spaces: z.enum(["underscore", "hyphen", "encode"]).default("underscore"),
  lowercase: z.boolean().default(true),
  overwrite: z.boolean().default(true),
});
export type UtmLinkBuilderOptions = z.infer<typeof utmLinkBuilderOptionsSchema>;

export const utmLinkBuilderInputSchema = z.string().max(100_000);

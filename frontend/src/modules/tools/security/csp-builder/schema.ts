import { z } from "zod";

export const cspBuilderOptionsSchema = z.object({
  defaultSrc: z.enum(["self", "none"]).default("self"),
  inlineStyles: z.boolean().default(false),
  inlineScripts: z.boolean().default(false),
  evalScripts: z.boolean().default(false),
  blockObjects: z.boolean().default(true),
  upgradeInsecure: z.boolean().default(true),
  frameAncestors: z.enum(["none", "self", "unset"]).default("none"),
  baseUri: z.boolean().default(true),
  formAction: z.boolean().default(true),
  allowData: z.boolean().default(true),
  reportOnly: z.boolean().default(false),
});
export type CspBuilderOptions = z.infer<typeof cspBuilderOptionsSchema>;

export const cspBuilderInputSchema = z.string().max(20_000);

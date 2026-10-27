import { z } from "zod";

export const macAddressToolOptionsSchema = z.object({
  mode: z.enum(["convert", "generate"]).default("convert"),
  style: z.enum(["colon", "hyphen", "cisco", "plain"]).default("colon"),
  upper: z.boolean().default(true),
  details: z.boolean().default(false),
  count: z.number().int().min(1).max(500).default(5),
  localAdmin: z.boolean().default(true),
});
export type MacAddressToolOptions = z.infer<typeof macAddressToolOptionsSchema>;

export const macAddressToolInputSchema = z.string().max(1000000);

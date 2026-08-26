import { z } from "zod";

export const faviconGeneratorOptionsSchema = z.object({
  sizes: z.array(z.number().int().positive()).min(1).default([16, 32, 48, 180, 192, 512]),
});
export type FaviconGeneratorOptions = z.infer<typeof faviconGeneratorOptionsSchema>;

export const STANDARD_FAVICON_SIZES = [16, 32, 48, 180, 192, 512] as const;

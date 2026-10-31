import { z } from "zod";

export const geohashPlusCodeConverterOptionsSchema = z.object({
  geohashPrecision: z.number().int().min(1).max(12).default(9),
  /** Plus code digits: 2, 4, 6, 8, 10 or 11–15 (11+ adds the 4×5 grid refinement) */
  plusLength: z.number().int().min(2).max(15).default(10),
  bounds: z.boolean().default(true),
  neighbors: z.boolean().default(false),
  decimals: z.number().int().min(1).max(12).default(6),
});
export type GeohashPlusCodeConverterOptions = z.infer<typeof geohashPlusCodeConverterOptionsSchema>;

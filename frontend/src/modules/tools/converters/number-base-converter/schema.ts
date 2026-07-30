import { z } from "zod";

export const numberBaseSchema = z.union([
  z.literal(2),
  z.literal(8),
  z.literal(10),
  z.literal(16),
]);
export type NumberBase = z.infer<typeof numberBaseSchema>;

export const numberBaseConverterInputSchema = z.string().max(256);

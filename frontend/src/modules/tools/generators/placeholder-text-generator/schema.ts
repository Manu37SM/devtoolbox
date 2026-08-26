import { z } from "zod";

export const placeholderTextVariantSchema = z.enum(["hipster", "corporate", "bacon"]);
export type PlaceholderTextVariant = z.infer<typeof placeholderTextVariantSchema>;

export const placeholderTextUnitSchema = z.enum(["words", "sentences", "paragraphs"]);
export type PlaceholderTextUnit = z.infer<typeof placeholderTextUnitSchema>;

export const placeholderTextOptionsSchema = z.object({
  variant: placeholderTextVariantSchema.default("hipster"),
  unit: placeholderTextUnitSchema.default("paragraphs"),
  count: z.number().int().min(1).max(50).default(3),
});
export type PlaceholderTextOptions = z.infer<typeof placeholderTextOptionsSchema>;

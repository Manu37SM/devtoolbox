import { z } from "zod";

export const placeholderTextVariantSchema = z.enum(["hipster", "corporate", "bacon"]);
export type PlaceholderTextVariant = z.infer<typeof placeholderTextVariantSchema>;

export const placeholderTextUnitSchema = z.enum(["words", "sentences", "paragraphs"]);
export type PlaceholderTextUnit = z.infer<typeof placeholderTextUnitSchema>;

export const placeholderTextOptionsSchema = z.object({
  variant: placeholderTextVariantSchema.default("hipster"),
  unit: placeholderTextUnitSchema.default("paragraphs"),
  count: z.number().int().min(1).max(50).default(3),
  /** Where the "Hipster ipsum" style opener appears. */
  opener: z.enum(["every", "first", "none"]).default("every"),
  wordsPerSentence: z.number().int().min(2).max(30).default(6),
  sentencesPerParagraph: z.number().int().min(1).max(20).default(4),
  /** Plain paragraphs (also valid Markdown) or <p> elements. */
  format: z.enum(["text", "html"]).default("text"),
});
export type PlaceholderTextOptions = z.infer<typeof placeholderTextOptionsSchema>;

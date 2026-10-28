import { z } from "zod";

export const fancyTextGeneratorOptionsSchema = z.object({
  style: z.enum(["all", "bold", "italic", "boldItalic", "script", "boldScript", "fraktur", "boldFraktur", "doubleStruck", "sans", "sansBold", "sansItalic", "monospace", "circled", "fullwidth", "smallCaps", "upsideDown", "strikethrough", "underline"]).default("all"),
});
export type FancyTextGeneratorOptions = z.infer<typeof fancyTextGeneratorOptionsSchema>;

export const fancyTextGeneratorInputSchema = z.string().max(10_000);

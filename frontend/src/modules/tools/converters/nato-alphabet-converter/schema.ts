import { z } from "zod";

export const natoAlphabetConverterOptionsSchema = z.object({
  mode: z.enum(["text-to-nato", "nato-to-text"]).default("text-to-nato"),
  icaoDigits: z.boolean().default(false),
});
export type NatoAlphabetConverterOptions = z.infer<typeof natoAlphabetConverterOptionsSchema>;

export const natoAlphabetConverterInputSchema = z.string().max(1000000);

import { z } from "zod";

export const indianNumberSystemConverterOptionsSchema = z.object({
  words: z.boolean().default(true),
  shorthand: z.boolean().default(true),
});
export type IndianNumberSystemConverterOptions = z.infer<typeof indianNumberSystemConverterOptionsSchema>;

export const indianNumberSystemConverterInputSchema = z.string().max(1000000);

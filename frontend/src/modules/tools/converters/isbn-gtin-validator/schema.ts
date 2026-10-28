import { z } from "zod";

export const isbnGtinValidatorOptionsSchema = z.object({
  convertIsbn: z.boolean().default(true),
});
export type IsbnGtinValidatorOptions = z.infer<typeof isbnGtinValidatorOptionsSchema>;

export const isbnGtinValidatorInputSchema = z.string().max(100_000);

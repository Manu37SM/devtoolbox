import { z } from "zod";

export const indianIdValidatorOptionsSchema = z.object({
  mask: z.boolean().default(true),
});
export type IndianIdValidatorOptions = z.infer<typeof indianIdValidatorOptionsSchema>;

export const indianIdValidatorInputSchema = z.string().max(1000000);

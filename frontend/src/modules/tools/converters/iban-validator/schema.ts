import { z } from "zod";

export const ibanValidatorOptionsSchema = z.object({
  format: z.enum(["grouped", "compact"]).default("grouped"),
});
export type IbanValidatorOptions = z.infer<typeof ibanValidatorOptionsSchema>;

export const ibanValidatorInputSchema = z.string().max(1000000);

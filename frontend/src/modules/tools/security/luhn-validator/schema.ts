import { z } from "zod";

export const luhnValidatorOptionsSchema = z.object({
  mode: z.enum(["validate", "generate"]).default("validate"),
  mask: z.boolean().default(true),
  brand: z.enum(["visa", "mastercard", "amex", "discover", "diners", "jcb", "unionpay", "rupay"]).default("visa"),
  count: z.number().int().min(1).max(50).default(3),
});
export type LuhnValidatorOptions = z.infer<typeof luhnValidatorOptionsSchema>;

export const luhnValidatorInputSchema = z.string().max(1000000);

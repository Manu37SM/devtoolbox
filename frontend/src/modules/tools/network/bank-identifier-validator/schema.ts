import { z } from "zod";

export const bankIdentifierValidatorOptionsSchema = z.object({
  type: z.enum(["auto", "bic", "aba", "sortcode", "ifsc", "bsb", "ca-transit"]).default("auto"),
  showDetails: z.boolean().default(true),
});
export type BankIdentifierValidatorOptions = z.infer<typeof bankIdentifierValidatorOptionsSchema>;

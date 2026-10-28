import { z } from "zod";

export const secretScannerOptionsSchema = z.object({
  includeGeneric: z.boolean().default(true),
  revealValues: z.boolean().default(false),
});
export type SecretScannerOptions = z.infer<typeof secretScannerOptionsSchema>;

import { z } from "zod";

export const cidrSubnetCalculatorOptionsSchema = z.object({
  cidr: z.string().default(""),
  /** Addresses the platform keeps for itself, which changes the usable range. */
  platform: z.enum(["standard", "aws", "azure", "gcp"]).default("standard"),
  /** Split the block into subnets of this prefix (0 = don't split). */
  splitPrefix: z.number().int().min(0).max(32).default(0),
  /** Show addresses and masks in binary as well. */
  showBinary: z.boolean().default(false),
});
export type CidrSubnetCalculatorOptions = z.infer<typeof cidrSubnetCalculatorOptionsSchema>;

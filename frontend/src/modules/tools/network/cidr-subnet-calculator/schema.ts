import { z } from "zod";

export const cidrSubnetCalculatorOptionsSchema = z.object({
  cidr: z.string().default(""),
});
export type CidrSubnetCalculatorOptions = z.infer<typeof cidrSubnetCalculatorOptionsSchema>;

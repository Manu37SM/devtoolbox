import { z } from "zod";

export const cidrAggregatorOptionsSchema = z.object({
  output: z.enum(["cidr", "range", "summary"]).default("cidr"),
});
export type CidrAggregatorOptions = z.infer<typeof cidrAggregatorOptionsSchema>;

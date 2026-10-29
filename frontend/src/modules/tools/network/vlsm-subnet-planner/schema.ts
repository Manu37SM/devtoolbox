import { z } from "zod";

export const vlsmSubnetPlannerOptionsSchema = z.object({
  platform: z.enum(["standard", "aws", "azure", "gcp"]).default("standard"),
  order: z.enum(["largest-first", "input"]).default("largest-first"),
});
export type VlsmSubnetPlannerOptions = z.infer<typeof vlsmSubnetPlannerOptionsSchema>;

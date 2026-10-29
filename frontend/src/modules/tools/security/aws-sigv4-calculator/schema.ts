import { z } from "zod";

export const awsSigv4CalculatorOptionsSchema = z.object({
  mode: z.enum(["header", "presigned"]).default("header"),
  unsignedPayload: z.boolean().default(false),
  showSteps: z.boolean().default(true),
});
export type AwsSigv4CalculatorOptions = z.infer<typeof awsSigv4CalculatorOptionsSchema>;

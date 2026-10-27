import { z } from "zod";

export const ieee754InspectorOptionsSchema = z.object({
  width: z.enum(["32", "64", "both"]).default("both"),
});
export type Ieee754InspectorOptions = z.infer<typeof ieee754InspectorOptionsSchema>;

export const ieee754InspectorInputSchema = z.string().max(1000000);

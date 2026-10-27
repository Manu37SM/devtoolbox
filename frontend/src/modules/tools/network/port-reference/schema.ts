import { z } from "zod";

export const portReferenceOptionsSchema = z.object({
  protocol: z.enum(["any", "TCP", "UDP"]).default("any"),
});
export type PortReferenceOptions = z.infer<typeof portReferenceOptionsSchema>;

export const portReferenceInputSchema = z.string().max(1000000);

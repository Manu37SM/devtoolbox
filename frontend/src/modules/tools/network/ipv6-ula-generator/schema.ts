import { z } from "zod";

export const ipv6UlaGeneratorOptionsSchema = z.object({
  count: z.number().int().min(1).max(50).default(1),
  showSubnets: z.boolean().default(true),
});
export type Ipv6UlaGeneratorOptions = z.infer<typeof ipv6UlaGeneratorOptionsSchema>;

export const ipv6UlaGeneratorInputSchema = z.string().max(1000000);

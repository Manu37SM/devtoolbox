import { z } from "zod";

export const ipv6AddressToolOptionsSchema = z.object({
  details: z.boolean().default(true),
});
export type Ipv6AddressToolOptions = z.infer<typeof ipv6AddressToolOptionsSchema>;

export const ipv6AddressToolInputSchema = z.string().max(100_000);

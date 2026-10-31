import { z } from "zod";

export const reverseDnsNameGeneratorOptionsSchema = z.object({
  /** Also print the BIND records that belong in the zone */
  bind: z.boolean().default(true),
  hostname: z.string().default("host.example.com."),
  ttl: z.number().int().min(0).max(2147483647).default(3600),
  /** RFC 2317 label between the first address and the prefix length: 128/25 or 128-25 */
  classlessSeparator: z.enum(["/", "-"]).default("/"),
  /** Without the trailing dot some resolvers/tools expect */
  trailingDot: z.boolean().default(true),
});
export type ReverseDnsNameGeneratorOptions = z.infer<typeof reverseDnsNameGeneratorOptionsSchema>;

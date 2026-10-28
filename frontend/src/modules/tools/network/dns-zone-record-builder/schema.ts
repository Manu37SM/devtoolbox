import { z } from "zod";

export const dnsZoneRecordBuilderOptionsSchema = z.object({
  ttl: z.number().int().min(0).max(2147483647).default(3600),
  autoDot: z.boolean().default(true),
  alignColumns: z.boolean().default(true),
});
export type DnsZoneRecordBuilderOptions = z.infer<typeof dnsZoneRecordBuilderOptionsSchema>;

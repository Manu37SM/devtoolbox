import { DnsLookupSchema } from "@devtoolbox/shared";

export const dnsLookupOptionsSchema = DnsLookupSchema;
export type DnsLookupOptions = ReturnType<typeof dnsLookupOptionsSchema.parse>;

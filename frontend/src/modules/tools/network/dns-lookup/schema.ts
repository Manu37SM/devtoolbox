import { DnsLookupSchema } from "@devtoolbox/shared";

// The request shape is the shared DTO itself (DEVELOPMENT_GUIDE.md §5) —
// this tool has no client-side transform logic beyond forwarding to the
// /net/dns proxy.
export const dnsLookupOptionsSchema = DnsLookupSchema;
export type DnsLookupOptions = ReturnType<typeof dnsLookupOptionsSchema.parse>;

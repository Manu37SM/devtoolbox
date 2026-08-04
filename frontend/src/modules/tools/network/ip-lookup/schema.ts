import { IpLookupSchema } from "@devtoolbox/shared";

// The request shape is the shared DTO itself (DEVELOPMENT_GUIDE.md §5) —
// this tool has no client-side transform logic beyond forwarding to the
// /net/ip-lookup proxy.
export const ipLookupOptionsSchema = IpLookupSchema;
export type IpLookupOptions = ReturnType<typeof ipLookupOptionsSchema.parse>;

import { IpLookupSchema } from "@devtoolbox/shared";

export const ipLookupOptionsSchema = IpLookupSchema;
export type IpLookupOptions = ReturnType<typeof ipLookupOptionsSchema.parse>;

import { UrlPreviewSchema } from "@devtoolbox/shared";

// The request shape is the shared DTO itself (DEVELOPMENT_GUIDE.md §5) —
// this tool has no client-side transform logic beyond forwarding to the
// /net/url-preview proxy.
export const metaTagPreviewerOptionsSchema = UrlPreviewSchema;
export type MetaTagPreviewerOptions = ReturnType<typeof metaTagPreviewerOptionsSchema.parse>;

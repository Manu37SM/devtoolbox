import { UrlPreviewSchema } from "@devtoolbox/shared";

export const metaTagPreviewerOptionsSchema = UrlPreviewSchema;
export type MetaTagPreviewerOptions = ReturnType<typeof metaTagPreviewerOptionsSchema.parse>;

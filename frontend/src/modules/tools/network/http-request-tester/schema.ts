import { z } from "zod";
import { HttpRequestProxySchema } from "@devtoolbox/shared";

// Re-exported for consistency with the tool contract (DEVELOPMENT_GUIDE.md
// §5) — the request shape is the shared DTO itself, since this tool is a
// thin UI over the /net/http-request proxy with no client-side transform
// logic of its own.
export const httpRequestTesterOptionsSchema = HttpRequestProxySchema;
export type HttpRequestTesterOptions = z.infer<typeof httpRequestTesterOptionsSchema>;

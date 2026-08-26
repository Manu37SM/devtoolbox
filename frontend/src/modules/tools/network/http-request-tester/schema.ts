import { z } from "zod";
import { HttpRequestProxySchema } from "@devtoolbox/shared";

export const httpRequestTesterOptionsSchema = HttpRequestProxySchema;
export type HttpRequestTesterOptions = z.infer<typeof httpRequestTesterOptionsSchema>;

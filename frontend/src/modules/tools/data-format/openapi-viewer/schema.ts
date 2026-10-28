import { z } from "zod";

export const openapiViewerOptionsSchema = z.object({
  view: z.enum(["all", "endpoints", "schemas", "lint"]).default("all"),
});
export type OpenapiViewerOptions = z.infer<typeof openapiViewerOptionsSchema>;

export const openapiViewerInputSchema = z.string().max(5_000_000);

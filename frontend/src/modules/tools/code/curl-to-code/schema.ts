import { z } from "zod";

export const curlTargetSchema = z.enum(["fetch", "axios", "python"]);
export type CurlTarget = z.infer<typeof curlTargetSchema>;

export const curlToCodeOptionsSchema = z.object({
  target: curlTargetSchema.default("fetch"),
});
export type CurlToCodeOptions = z.infer<typeof curlToCodeOptionsSchema>;

export const curlToCodeInputSchema = z.string().max(200_000);

import { z } from "zod";

export const cacheControlBuilderOptionsSchema = z.object({
  visibility: z.enum(["public", "private", "unspecified"]).default("public"),
  maxAge: z.number().int().min(0).max(31536000 * 10).default(3600),
  sMaxAge: z.number().int().min(-1).max(31536000 * 10).default(-1),
  staleWhileRevalidate: z.number().int().min(0).max(31536000).default(0),
  staleIfError: z.number().int().min(0).max(31536000).default(0),
  noCache: z.boolean().default(false),
  noStore: z.boolean().default(false),
  mustRevalidate: z.boolean().default(false),
  immutable: z.boolean().default(false),
  noTransform: z.boolean().default(false),
});
export type CacheControlBuilderOptions = z.infer<typeof cacheControlBuilderOptionsSchema>;

export const cacheControlBuilderInputSchema = z.string().max(10_000);

import { z } from "zod";

export const jsonDiffOptionsSchema = z.object({
  ignoreArrayOrder: z.boolean().default(false),
  /**
   * Keys or paths to leave out of the comparison, comma or newline separated:
   * "updatedAt" (any depth), "meta.requestId", "items[*].etag", "*.version".
   */
  ignorePaths: z.string().max(10_000).default(""),
  ignoreCase: z.boolean().default(false),
  /** Numbers closer than this count as equal (0 = exact). */
  numericTolerance: z.number().min(0).default(0),
  /** "summary" lists +/-/~ lines; "patch" emits an RFC 6902 JSON Patch that turns Before into After. */
  output: z.enum(["summary", "patch"]).default("summary"),
});
export type JsonDiffOptions = z.infer<typeof jsonDiffOptionsSchema>;

export const jsonDiffInputSchema = z.string().max(5_000_000, {
  message: "Input exceeds the 5MB client-side processing limit.",
});

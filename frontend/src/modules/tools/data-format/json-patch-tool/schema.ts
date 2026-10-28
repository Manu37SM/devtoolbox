import { z } from "zod";

export const jsonPatchToolOptionsSchema = z.object({
  mode: z.enum(["apply", "diff"]).default("apply"),
  indent: z.number().int().min(0).max(8).default(2),
});
export type JsonPatchToolOptions = z.infer<typeof jsonPatchToolOptionsSchema>;

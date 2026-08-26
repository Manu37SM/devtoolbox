import { z } from "zod";

export const uuidBulkOptionsSchema = z.object({
  version: z.enum(["v4", "v7"]).default("v4"),
  count: z.number().int().min(1).max(10_000).default(100),
  format: z.enum(["newline", "json-array", "csv"]).default("newline"),
});
export type UuidBulkOptions = z.infer<typeof uuidBulkOptionsSchema>;

import { z } from "zod";

// Bulk mode reuses the same generation engine as Module 3's UUID
// Generator (FEATURE.md: "shared engine with Module 3") but allows a much
// higher count and an export-format choice, since the use case here is
// "generate 5,000 IDs for a seed script" rather than "grab one UUID".
export const uuidBulkOptionsSchema = z.object({
  version: z.enum(["v4", "v7"]).default("v4"),
  count: z.number().int().min(1).max(10_000).default(100),
  format: z.enum(["newline", "json-array", "csv"]).default("newline"),
});
export type UuidBulkOptions = z.infer<typeof uuidBulkOptionsSchema>;

import { z } from "zod";

export const threadDumpAnalyzerOptionsSchema = z.object({
  format: z.enum(["report", "json"]).default("report"),
  stackDepth: z.number().int().min(1).max(30).default(5),
  hideJvmThreads: z.boolean().default(true),
});
export type ThreadDumpAnalyzerOptions = z.infer<typeof threadDumpAnalyzerOptionsSchema>;

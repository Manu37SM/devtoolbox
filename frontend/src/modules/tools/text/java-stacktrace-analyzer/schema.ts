import { z } from "zod";

export const javaStacktraceAnalyzerOptionsSchema = z.object({
  appPackages: z.string().max(10000).default("com."),
  showFrames: z.boolean().default(true),
});
export type JavaStacktraceAnalyzerOptions = z.infer<typeof javaStacktraceAnalyzerOptionsSchema>;

export const javaStacktraceAnalyzerInputSchema = z.string().max(1000000);

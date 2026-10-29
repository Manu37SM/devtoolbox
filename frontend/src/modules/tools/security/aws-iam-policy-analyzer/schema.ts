import { z } from "zod";

export const awsIamPolicyAnalyzerOptionsSchema = z.object({
  minSeverity: z.enum(["info", "warning", "error"]).default("info"),
});
export type AwsIamPolicyAnalyzerOptions = z.infer<typeof awsIamPolicyAnalyzerOptionsSchema>;

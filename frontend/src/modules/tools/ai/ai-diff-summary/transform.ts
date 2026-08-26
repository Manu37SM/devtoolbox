import type { AiDiffSummaryResult } from "@devtoolbox/shared";
import { apiPost } from "@/lib/api-client";
import type { AiDiffSummaryOptions } from "./schema";

export async function summarizeDiff(options: AiDiffSummaryOptions): Promise<AiDiffSummaryResult> {
  return apiPost<AiDiffSummaryResult>("/ai/diff-summary", options);
}

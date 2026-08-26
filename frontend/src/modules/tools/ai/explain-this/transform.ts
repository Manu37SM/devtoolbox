import type { AiExplainResult } from "@devtoolbox/shared";
import { apiPost } from "@/lib/api-client";
import type { ExplainThisOptions } from "./schema";

export async function explainExpression(options: ExplainThisOptions): Promise<AiExplainResult> {
  return apiPost<AiExplainResult>("/ai/explain", { toolSlug: "explain-this", ...options });
}

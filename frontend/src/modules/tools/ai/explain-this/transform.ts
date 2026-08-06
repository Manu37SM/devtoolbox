import type { AiExplainResult } from "@devtoolbox/shared";
import { apiPost } from "@/lib/api-client";
import type { ExplainThisOptions } from "./schema";

/** Thin call-forwarding wrapper over POST /ai/explain (API.md §9) — not a
 * pure transform, same category as Module 8's server-proxied tools.
 * `toolSlug` is fixed to this tool's own slug (used only for anonymized
 * AiUsageEvent attribution server-side, never persisted content). */
export async function explainExpression(options: ExplainThisOptions): Promise<AiExplainResult> {
  return apiPost<AiExplainResult>("/ai/explain", { toolSlug: "explain-this", ...options });
}

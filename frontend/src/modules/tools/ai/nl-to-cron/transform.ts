import type { AiGenerateResult } from "@devtoolbox/shared";
import { apiPost } from "@/lib/api-client";
import type { NlToCronOptions } from "./schema";

/** Thin call-forwarding wrapper over POST /ai/generate (target: "cron") —
 * API.md §9. The backend always deterministically validates the generated
 * cron expression before returning it (see backend's
 * deterministic/validate-generated.ts) — `result.validated` reflects that
 * check, not a guess. */
export async function generateCron(options: NlToCronOptions): Promise<AiGenerateResult> {
  return apiPost<AiGenerateResult>("/ai/generate", { target: "cron", prompt: options.prompt });
}

import type { AiGenerateResult } from "@devtoolbox/shared";
import { apiPost } from "@/lib/api-client";
import type { NlToRegexOptions } from "./schema";

/** Thin call-forwarding wrapper over POST /ai/generate (target: "regex") —
 * API.md §9. Per FEATURE.md, a generated regex is only ever shown as
 * "confirmed" once it demonstrably matches every example string the user
 * supplied — the backend enforces that deterministically after the AI call
 * (see deterministic/validate-generated.ts); `result.validated` reflects
 * that check, not a model self-assessment. */
export async function generateRegex(options: NlToRegexOptions): Promise<AiGenerateResult> {
  return apiPost<AiGenerateResult>("/ai/generate", {
    target: "regex",
    prompt: options.prompt,
    examples: options.examples,
  });
}

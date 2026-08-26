import type { AiGenerateResult } from "@devtoolbox/shared";
import { apiPost } from "@/lib/api-client";
import type { NlToRegexOptions } from "./schema";

export async function generateRegex(options: NlToRegexOptions): Promise<AiGenerateResult> {
  return apiPost<AiGenerateResult>("/ai/generate", {
    target: "regex",
    prompt: options.prompt,
    examples: options.examples,
  });
}

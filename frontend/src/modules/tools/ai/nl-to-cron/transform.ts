import type { AiGenerateResult } from "@devtoolbox/shared";
import { apiPost } from "@/lib/api-client";
import type { NlToCronOptions } from "./schema";

export async function generateCron(options: NlToCronOptions): Promise<AiGenerateResult> {
  return apiPost<AiGenerateResult>("/ai/generate", { target: "cron", prompt: options.prompt });
}

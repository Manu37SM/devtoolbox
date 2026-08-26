import type { AiJsonRepairResult } from "@devtoolbox/shared";
import { apiPost } from "@/lib/api-client";
import type { AiJsonRepairOptions } from "./schema";

export async function repairJson(options: AiJsonRepairOptions): Promise<AiJsonRepairResult> {
  return apiPost<AiJsonRepairResult>("/ai/json-repair", options);
}

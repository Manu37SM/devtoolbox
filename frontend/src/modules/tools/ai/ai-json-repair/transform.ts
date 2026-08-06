import type { AiJsonRepairResult } from "@devtoolbox/shared";
import { apiPost } from "@/lib/api-client";
import type { AiJsonRepairOptions } from "./schema";

/** Thin call-forwarding wrapper over POST /ai/json-repair (API.md §9). The
 * backend always attempts a deterministic repair (trailing commas,
 * unquoted keys, single quotes, comments) before ever calling the AI model
 * — `result.repairedBy` tells you which path actually fixed it, so this
 * tool doesn't need its own local deterministic-repair copy per CLAUDE.md's
 * "don't duplicate logic across tools" guidance. */
export async function repairJson(options: AiJsonRepairOptions): Promise<AiJsonRepairResult> {
  return apiPost<AiJsonRepairResult>("/ai/json-repair", options);
}

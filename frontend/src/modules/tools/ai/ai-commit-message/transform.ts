import type { AiCommitMessageResult } from "@devtoolbox/shared";
import { apiPost } from "@/lib/api-client";
import type { AiCommitMessageOptions } from "./schema";

export async function generateCommitMessage(options: AiCommitMessageOptions): Promise<AiCommitMessageResult> {
  return apiPost<AiCommitMessageResult>("/ai/commit-message", { diff: options.diff });
}

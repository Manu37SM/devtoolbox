import type { AiCommitMessageResult } from "@devtoolbox/shared";
import { apiPost } from "@/lib/api-client";
import type { AiCommitMessageOptions } from "./schema";

/** Thin call-forwarding wrapper over POST /ai/commit-message — API.md §9.
 * The backend generates both a single-line conventional-commits-style
 * message and a longer PR description from the same diff in one call. */
export async function generateCommitMessage(options: AiCommitMessageOptions): Promise<AiCommitMessageResult> {
  return apiPost<AiCommitMessageResult>("/ai/commit-message", { diff: options.diff });
}

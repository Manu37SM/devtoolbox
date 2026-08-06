import type { AiCodeCommentResult } from "@devtoolbox/shared";
import { apiPost } from "@/lib/api-client";
import type { CodeCommenterOptions } from "./schema";

/** Thin call-forwarding wrapper over POST /ai/code-comment — API.md §9.
 * The code itself is left unchanged; only comments/docstrings are added. */
export async function commentCode(options: CodeCommenterOptions): Promise<AiCodeCommentResult> {
  return apiPost<AiCodeCommentResult>("/ai/code-comment", {
    code: options.code,
    language: options.language,
  });
}

import type { AiCodeCommentResult } from "@devtoolbox/shared";
import { apiPost } from "@/lib/api-client";
import type { CodeCommenterOptions } from "./schema";

export async function commentCode(options: CodeCommenterOptions): Promise<AiCodeCommentResult> {
  return apiPost<AiCodeCommentResult>("/ai/code-comment", {
    code: options.code,
    language: options.language,
  });
}

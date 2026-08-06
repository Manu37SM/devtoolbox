import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AiCommitMessageResult } from "@devtoolbox/shared";

vi.mock("@/lib/api-client", () => ({
  apiPost: vi.fn(),
  ApiClientError: class ApiClientError extends Error {},
}));

import { apiPost } from "@/lib/api-client";
import { generateCommitMessage } from "./transform";

describe("generateCommitMessage", () => {
  beforeEach(() => {
    vi.mocked(apiPost).mockReset();
  });

  it("calls apiPost against /ai/commit-message with the diff", async () => {
    const result: AiCommitMessageResult = {
      commitMessage: "fix: guard against empty input",
      prDescription: "Adds a null check before parsing.",
      model: "claude-sonnet-4-5",
      dataSentPreview: "[commit-message] --- a/x.ts",
    };
    vi.mocked(apiPost).mockResolvedValue(result);

    const returned = await generateCommitMessage({ diff: "--- a/x.ts\n+++ b/x.ts" });

    expect(apiPost).toHaveBeenCalledWith("/ai/commit-message", { diff: "--- a/x.ts\n+++ b/x.ts" });
    expect(returned).toBe(result);
  });
});

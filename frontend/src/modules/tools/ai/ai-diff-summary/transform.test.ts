import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AiDiffSummaryResult } from "@devtoolbox/shared";

vi.mock("@/lib/api-client", () => ({
  apiPost: vi.fn(),
  ApiClientError: class ApiClientError extends Error {},
}));

import { apiPost } from "@/lib/api-client";
import { summarizeDiff } from "./transform";

describe("summarizeDiff", () => {
  beforeEach(() => {
    vi.mocked(apiPost).mockReset();
  });

  it("calls apiPost against /ai/diff-summary with before/after/format", async () => {
    const result: AiDiffSummaryResult = { summary: "Renamed a field.", model: "claude-sonnet-4-5", dataSentPreview: "..." };
    vi.mocked(apiPost).mockResolvedValue(result);

    const returned = await summarizeDiff({ before: '{"a":1}', after: '{"b":1}', format: "json" });

    expect(apiPost).toHaveBeenCalledWith("/ai/diff-summary", { before: '{"a":1}', after: '{"b":1}', format: "json" });
    expect(returned).toBe(result);
  });
});

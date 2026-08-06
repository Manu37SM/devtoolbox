import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AiExplainResult } from "@devtoolbox/shared";

vi.mock("@/lib/api-client", () => ({
  apiPost: vi.fn(),
  ApiClientError: class ApiClientError extends Error {},
}));

import { apiPost } from "@/lib/api-client";
import { explainExpression } from "./transform";

describe("explainExpression", () => {
  beforeEach(() => {
    vi.mocked(apiPost).mockReset();
  });

  it("calls apiPost against /ai/explain with this tool's slug and the given options", async () => {
    const result: AiExplainResult = { explanation: "Matches digits.", model: "claude-haiku-4-5", dataSentPreview: "[regex] \\d+" };
    vi.mocked(apiPost).mockResolvedValue(result);

    const returned = await explainExpression({ subject: "regex", input: "\\d+" });

    expect(apiPost).toHaveBeenCalledWith("/ai/explain", { toolSlug: "explain-this", subject: "regex", input: "\\d+" });
    expect(returned).toBe(result);
  });
});

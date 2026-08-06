import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AiGenerateResult } from "@devtoolbox/shared";

vi.mock("@/lib/api-client", () => ({
  apiPost: vi.fn(),
  ApiClientError: class ApiClientError extends Error {},
}));

import { apiPost } from "@/lib/api-client";
import { generateCron } from "./transform";

describe("generateCron", () => {
  beforeEach(() => {
    vi.mocked(apiPost).mockReset();
  });

  it("calls apiPost against /ai/generate with target: cron", async () => {
    const result: AiGenerateResult = {
      result: "0 9 * * 1-5",
      explanation: "Weekdays at 9am.",
      validated: true,
      model: "claude-haiku-4-5",
      dataSentPreview: "[generate:cron] every weekday at 9am",
    };
    vi.mocked(apiPost).mockResolvedValue(result);

    const returned = await generateCron({ prompt: "every weekday at 9am" });

    expect(apiPost).toHaveBeenCalledWith("/ai/generate", { target: "cron", prompt: "every weekday at 9am" });
    expect(returned).toBe(result);
  });
});

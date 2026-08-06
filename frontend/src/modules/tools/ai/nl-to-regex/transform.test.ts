import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AiGenerateResult } from "@devtoolbox/shared";

vi.mock("@/lib/api-client", () => ({
  apiPost: vi.fn(),
  ApiClientError: class ApiClientError extends Error {},
}));

import { apiPost } from "@/lib/api-client";
import { generateRegex } from "./transform";

describe("generateRegex", () => {
  beforeEach(() => {
    vi.mocked(apiPost).mockReset();
  });

  it("calls apiPost against /ai/generate with target: regex and passes examples through", async () => {
    const result: AiGenerateResult = {
      result: "^\\d{3}-\\d{4}$",
      explanation: "Matches a phone extension.",
      validated: true,
      model: "claude-haiku-4-5",
      dataSentPreview: "[generate:regex] a phone extension",
    };
    vi.mocked(apiPost).mockResolvedValue(result);

    const returned = await generateRegex({ prompt: "a phone extension", examples: ["555-1234"] });

    expect(apiPost).toHaveBeenCalledWith("/ai/generate", {
      target: "regex",
      prompt: "a phone extension",
      examples: ["555-1234"],
    });
    expect(returned).toBe(result);
  });

  it("omits examples when none are given", async () => {
    vi.mocked(apiPost).mockResolvedValue({} as AiGenerateResult);

    await generateRegex({ prompt: "a phone extension" });

    expect(apiPost).toHaveBeenCalledWith("/ai/generate", { target: "regex", prompt: "a phone extension", examples: undefined });
  });
});

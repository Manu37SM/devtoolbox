import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AiCodeCommentResult } from "@devtoolbox/shared";

vi.mock("@/lib/api-client", () => ({
  apiPost: vi.fn(),
  ApiClientError: class ApiClientError extends Error {},
}));

import { apiPost } from "@/lib/api-client";
import { commentCode } from "./transform";

describe("commentCode", () => {
  beforeEach(() => {
    vi.mocked(apiPost).mockReset();
  });

  it("calls apiPost against /ai/code-comment with code and language", async () => {
    const result: AiCodeCommentResult = {
      commented: "// adds two numbers\nfunction add(a, b) { return a + b; }",
      model: "claude-haiku-4-5",
      dataSentPreview: "[code-comment:javascript] function add",
    };
    vi.mocked(apiPost).mockResolvedValue(result);

    const returned = await commentCode({ code: "function add(a, b) { return a + b; }", language: "javascript" });

    expect(apiPost).toHaveBeenCalledWith("/ai/code-comment", {
      code: "function add(a, b) { return a + b; }",
      language: "javascript",
    });
    expect(returned).toBe(result);
  });

  it("omits language when not given", async () => {
    vi.mocked(apiPost).mockResolvedValue({} as AiCodeCommentResult);

    await commentCode({ code: "x = 1" });

    expect(apiPost).toHaveBeenCalledWith("/ai/code-comment", { code: "x = 1", language: undefined });
  });
});

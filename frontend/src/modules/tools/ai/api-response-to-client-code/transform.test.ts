import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AiClientCodeResult } from "@devtoolbox/shared";

vi.mock("@/lib/api-client", () => ({
  apiPost: vi.fn(),
  ApiClientError: class ApiClientError extends Error {},
}));

import { apiPost } from "@/lib/api-client";
import { generateClientCode } from "./transform";

describe("generateClientCode", () => {
  beforeEach(() => {
    vi.mocked(apiPost).mockReset();
  });

  it("calls apiPost against /ai/client-code with sampleResponse, target, and typeName", async () => {
    const result: AiClientCodeResult = {
      code: "interface User { id: number; }\nasync function getUser() {}",
      model: "claude-haiku-4-5",
      dataSentPreview: "[client-code:fetch] {\"id\":1}",
    };
    vi.mocked(apiPost).mockResolvedValue(result);

    const returned = await generateClientCode({ sampleResponse: '{"id":1}', target: "fetch", typeName: "User" });

    expect(apiPost).toHaveBeenCalledWith("/ai/client-code", {
      sampleResponse: '{"id":1}',
      target: "fetch",
      typeName: "User",
    });
    expect(returned).toBe(result);
  });

  it("omits typeName when not given", async () => {
    vi.mocked(apiPost).mockResolvedValue({} as AiClientCodeResult);

    await generateClientCode({ sampleResponse: '{"id":1}', target: "axios" });

    expect(apiPost).toHaveBeenCalledWith("/ai/client-code", {
      sampleResponse: '{"id":1}',
      target: "axios",
      typeName: undefined,
    });
  });
});

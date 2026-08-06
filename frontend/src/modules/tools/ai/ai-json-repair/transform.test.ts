import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AiJsonRepairResult } from "@devtoolbox/shared";

vi.mock("@/lib/api-client", () => ({
  apiPost: vi.fn(),
  ApiClientError: class ApiClientError extends Error {},
}));

import { apiPost } from "@/lib/api-client";
import { repairJson } from "./transform";

describe("repairJson", () => {
  beforeEach(() => {
    vi.mocked(apiPost).mockReset();
  });

  it("calls apiPost against /ai/json-repair with the input", async () => {
    const result: AiJsonRepairResult = { repaired: '{"a":1}', repairedBy: "deterministic" };
    vi.mocked(apiPost).mockResolvedValue(result);

    const returned = await repairJson({ input: '{"a":1,}' });

    expect(apiPost).toHaveBeenCalledWith("/ai/json-repair", { input: '{"a":1,}' });
    expect(returned).toBe(result);
  });
});

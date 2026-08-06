import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AiGenerateResult } from "@devtoolbox/shared";

vi.mock("@/lib/api-client", () => ({
  apiPost: vi.fn(),
  ApiClientError: class ApiClientError extends Error {},
}));

import { apiPost } from "@/lib/api-client";
import { generateFromExample } from "./transform";

describe("generateFromExample", () => {
  beforeEach(() => {
    vi.mocked(apiPost).mockReset();
  });

  it("splits sample lines into examples for target regex", async () => {
    vi.mocked(apiPost).mockResolvedValue({} as AiGenerateResult);

    await generateFromExample({ target: "regex", sample: "555-123-4567\n\n800-555-0199\n" });

    expect(apiPost).toHaveBeenCalledWith("/ai/generate", {
      target: "regex",
      prompt: expect.stringContaining("Infer a regular expression"),
      examples: ["555-123-4567", "800-555-0199"],
    });
  });

  it("caps regex examples at 10 lines", async () => {
    vi.mocked(apiPost).mockResolvedValue({} as AiGenerateResult);
    const sample = Array.from({ length: 15 }, (_, i) => `value-${i}`).join("\n");

    await generateFromExample({ target: "regex", sample });

    const call = vi.mocked(apiPost).mock.calls[0]![1] as { examples: string[] };
    expect(call.examples).toHaveLength(10);
  });

  it("folds the sample JSON into prompt for target json-schema, with no examples field", async () => {
    vi.mocked(apiPost).mockResolvedValue({} as AiGenerateResult);
    const sample = '{"id": 1, "name": "Ada"}';

    await generateFromExample({ target: "json-schema", sample });

    expect(apiPost).toHaveBeenCalledWith("/ai/generate", {
      target: "json-schema",
      prompt: expect.stringContaining(sample),
    });
    const call = vi.mocked(apiPost).mock.calls[0]![1] as Record<string, unknown>;
    expect(call.examples).toBeUndefined();
  });
});

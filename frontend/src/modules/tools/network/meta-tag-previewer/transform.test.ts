import { describe, expect, it, vi, beforeEach } from "vitest";
import type { UrlPreviewDto, UrlPreviewResult } from "@devtoolbox/shared";

vi.mock("@/lib/api-client", () => ({
  apiPost: vi.fn(),
  ApiClientError: class ApiClientError extends Error {
    status: number;
    code?: string;
    constructor(message: string, status: number, code?: string) {
      super(message);
      this.name = "ApiClientError";
      this.status = status;
      this.code = code;
    }
  },
}));

import { apiPost, ApiClientError } from "@/lib/api-client";
import { previewUrl } from "./transform";

describe("previewUrl", () => {
  beforeEach(() => {
    vi.mocked(apiPost).mockReset();
  });

  it("calls apiPost with the /net/url-preview path and the dto as payload", async () => {
    const dto: UrlPreviewDto = { url: "https://example.com/article" };
    const result: UrlPreviewResult = {
      url: "https://example.com/article",
      title: "An article",
      description: "A description",
      image: "https://example.com/og.png",
      siteName: "Example",
      favicon: "https://example.com/favicon.ico",
    };
    vi.mocked(apiPost).mockResolvedValue(result);

    const returned = await previewUrl(dto);

    expect(apiPost).toHaveBeenCalledWith("/net/url-preview", dto);
    expect(returned).toBe(result);
  });

  it("lets ApiClientError from apiPost propagate rather than swallowing it", async () => {
    const dto: UrlPreviewDto = { url: "https://example.com" };
    vi.mocked(apiPost).mockRejectedValue(new ApiClientError("Could not fetch URL", 502));

    await expect(previewUrl(dto)).rejects.toThrow("Could not fetch URL");
  });
});

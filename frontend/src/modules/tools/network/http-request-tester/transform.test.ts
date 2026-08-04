import { describe, expect, it, vi, beforeEach } from "vitest";
import type { HttpRequestProxyDto, HttpRequestProxyResult } from "@devtoolbox/shared";

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
import { sendHttpRequest } from "./transform";

describe("sendHttpRequest", () => {
  beforeEach(() => {
    vi.mocked(apiPost).mockReset();
  });

  it("calls apiPost with the /net/http-request path and the dto as payload", async () => {
    const dto: HttpRequestProxyDto = {
      method: "POST",
      url: "https://example.com/api",
      headers: { "content-type": "application/json" },
      body: '{"a":1}',
    };
    const result: HttpRequestProxyResult = {
      status: 200,
      statusText: "OK",
      headers: {},
      body: "{}",
      bodyTruncated: false,
      durationMs: 42,
    };
    vi.mocked(apiPost).mockResolvedValue(result);

    const returned = await sendHttpRequest(dto);

    expect(apiPost).toHaveBeenCalledWith("/net/http-request", dto);
    expect(returned).toBe(result);
  });

  it("lets ApiClientError from apiPost propagate rather than swallowing it", async () => {
    const dto: HttpRequestProxyDto = { method: "GET", url: "https://example.com", headers: {} };
    vi.mocked(apiPost).mockRejectedValue(new ApiClientError("Request failed (500)", 500));

    await expect(sendHttpRequest(dto)).rejects.toThrow("Request failed (500)");
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";
import type { DnsLookupDto, DnsLookupResult } from "@devtoolbox/shared";

vi.mock("@/lib/api-client", () => ({
  apiGet: vi.fn(),
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

import { apiGet, ApiClientError } from "@/lib/api-client";
import { lookupDns } from "./transform";

describe("lookupDns", () => {
  beforeEach(() => {
    vi.mocked(apiGet).mockReset();
  });

  it("calls apiGet with a correctly encoded query string", async () => {
    const dto: DnsLookupDto = { domain: "exa mple.com", recordType: "MX" };
    const result: DnsLookupResult = { domain: "exa mple.com", recordType: "MX", records: ["10 mail.example.com"] };
    vi.mocked(apiGet).mockResolvedValue(result);

    const returned = await lookupDns(dto);

    expect(apiGet).toHaveBeenCalledWith("/net/dns?domain=exa+mple.com&recordType=MX");
    expect(returned).toBe(result);
  });

  it("lets ApiClientError from apiGet propagate rather than swallowing it", async () => {
    const dto: DnsLookupDto = { domain: "example.com", recordType: "A" };
    vi.mocked(apiGet).mockRejectedValue(new ApiClientError("Not found", 404));

    await expect(lookupDns(dto)).rejects.toThrow("Not found");
  });
});

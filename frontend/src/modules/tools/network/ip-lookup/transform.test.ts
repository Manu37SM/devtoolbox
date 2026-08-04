import { describe, expect, it, vi, beforeEach } from "vitest";
import type { IpLookupDto, IpLookupResult } from "@devtoolbox/shared";

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
import { lookupIp } from "./transform";

describe("lookupIp", () => {
  beforeEach(() => {
    vi.mocked(apiGet).mockReset();
  });

  it("calls apiGet with an encoded ip query string when an IP is given", async () => {
    const dto: IpLookupDto = { ip: "8.8.8.8" };
    const result: IpLookupResult = { ip: "8.8.8.8", country: "US" };
    vi.mocked(apiGet).mockResolvedValue(result);

    const returned = await lookupIp(dto);

    expect(apiGet).toHaveBeenCalledWith("/net/ip-lookup?ip=8.8.8.8");
    expect(returned).toBe(result);
  });

  it("calls apiGet with no query string when ip is omitted", async () => {
    const result: IpLookupResult = { ip: "1.2.3.4" };
    vi.mocked(apiGet).mockResolvedValue(result);

    const returned = await lookupIp({});

    expect(apiGet).toHaveBeenCalledWith("/net/ip-lookup");
    expect(returned).toBe(result);
  });

  it("lets ApiClientError from apiGet propagate rather than swallowing it", async () => {
    vi.mocked(apiGet).mockRejectedValue(new ApiClientError("Invalid IP", 400));

    await expect(lookupIp({ ip: "not-an-ip" })).rejects.toThrow("Invalid IP");
  });
});

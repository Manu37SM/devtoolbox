import { assertUrlIsSafe, SsrfBlockedError } from "./ssrf-guard";

jest.mock("node:dns/promises", () => ({
  lookup: jest.fn(),
}));

import { lookup } from "node:dns/promises";
const mockLookup = lookup as jest.MockedFunction<typeof lookup>;

describe("assertUrlIsSafe", () => {
  beforeEach(() => {
    mockLookup.mockReset();
  });

  it("allows a URL whose literal IP is public", async () => {
    await expect(assertUrlIsSafe("http://8.8.8.8/")).resolves.toBeInstanceOf(URL);
  });

  it("rejects a URL pointing at a literal loopback IP", async () => {
    await expect(assertUrlIsSafe("http://127.0.0.1/")).rejects.toThrow(SsrfBlockedError);
  });

  it("rejects RFC1918 private ranges (10.x, 172.16-31.x, 192.168.x)", async () => {
    await expect(assertUrlIsSafe("http://10.0.0.5/")).rejects.toThrow(SsrfBlockedError);
    await expect(assertUrlIsSafe("http://172.16.0.1/")).rejects.toThrow(SsrfBlockedError);
    await expect(assertUrlIsSafe("http://172.31.255.255/")).rejects.toThrow(SsrfBlockedError);
    await expect(assertUrlIsSafe("http://192.168.1.1/")).rejects.toThrow(SsrfBlockedError);
  });

  it("does not treat 172.15.x / 172.32.x as private (boundary check)", async () => {
    await expect(assertUrlIsSafe("http://172.15.0.1/")).resolves.toBeInstanceOf(URL);
    await expect(assertUrlIsSafe("http://172.32.0.1/")).resolves.toBeInstanceOf(URL);
  });

  it("rejects the link-local range, including the cloud metadata IP", async () => {
    await expect(assertUrlIsSafe("http://169.254.169.254/")).rejects.toThrow(SsrfBlockedError);
  });

  it("rejects carrier-grade NAT range 100.64.0.0/10", async () => {
    await expect(assertUrlIsSafe("http://100.64.0.1/")).rejects.toThrow(SsrfBlockedError);
  });

  it("rejects multicast/reserved IPv4 (224.0.0.0/4 and above)", async () => {
    await expect(assertUrlIsSafe("http://224.0.0.1/")).rejects.toThrow(SsrfBlockedError);
    await expect(assertUrlIsSafe("http://255.255.255.255/")).rejects.toThrow(SsrfBlockedError);
  });

  it("rejects a non-http(s) scheme", async () => {
    await expect(assertUrlIsSafe("file:///etc/passwd")).rejects.toThrow(SsrfBlockedError);
    await expect(assertUrlIsSafe("ftp://example.com/")).rejects.toThrow(SsrfBlockedError);
  });

  it("rejects an unparseable URL", async () => {
    await expect(assertUrlIsSafe("not a url")).rejects.toThrow(SsrfBlockedError);
  });

  it("rejects IPv6 loopback (::1)", async () => {
    await expect(assertUrlIsSafe("http://[::1]/")).rejects.toThrow(SsrfBlockedError);
  });

  it("rejects IPv6 unique-local (fc00::/7) and link-local (fe80::/10)", async () => {
    await expect(assertUrlIsSafe("http://[fd00::1]/")).rejects.toThrow(SsrfBlockedError);
    await expect(assertUrlIsSafe("http://[fe80::1]/")).rejects.toThrow(SsrfBlockedError);
  });

  it("allows a hostname that resolves to a public IP (mocked DNS)", async () => {
    mockLookup.mockResolvedValue({ address: "93.184.216.34", family: 4 });
    await expect(assertUrlIsSafe("http://example.com/")).resolves.toBeInstanceOf(URL);
  });

  it("rejects a hostname that resolves to a private IP (mocked DNS)", async () => {
    mockLookup.mockResolvedValue({ address: "127.0.0.1", family: 4 });
    await expect(assertUrlIsSafe("http://sneaky.example.com/")).rejects.toThrow(SsrfBlockedError);
  });

  it("rejects a hostname that fails to resolve", async () => {
    mockLookup.mockRejectedValue(new Error("ENOTFOUND"));
    await expect(assertUrlIsSafe("http://does-not-exist.invalid/")).rejects.toThrow(SsrfBlockedError);
  });
});

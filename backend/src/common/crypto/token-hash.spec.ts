import { generateOpaqueToken, hashIp, hashToken } from "./token-hash";

describe("generateOpaqueToken", () => {
  it("returns a raw token whose hash matches hashToken(raw)", () => {
    const { raw, hash } = generateOpaqueToken();
    expect(hash).toBe(hashToken(raw));
  });

  it("generates a sufficiently long, URL-safe raw token", () => {
    const { raw } = generateOpaqueToken();
    expect(raw.length).toBeGreaterThanOrEqual(32);
    expect(raw).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("never repeats across calls", () => {
    const a = generateOpaqueToken();
    const b = generateOpaqueToken();
    expect(a.raw).not.toBe(b.raw);
    expect(a.hash).not.toBe(b.hash);
  });
});

describe("hashToken", () => {
  it("is deterministic", () => {
    expect(hashToken("same-input")).toBe(hashToken("same-input"));
  });

  it("produces different hashes for different inputs", () => {
    expect(hashToken("a")).not.toBe(hashToken("b"));
  });

  it("never returns the raw input (not a no-op)", () => {
    expect(hashToken("plaintext-token")).not.toBe("plaintext-token");
  });
});

describe("hashIp", () => {
  it("is deterministic and never returns the raw IP", () => {
    const ip = "203.0.113.42";
    const hashed = hashIp(ip);
    expect(hashed).toBe(hashIp(ip));
    expect(hashed).not.toBe(ip);
  });
});

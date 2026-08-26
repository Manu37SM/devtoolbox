import { describe, expect, it } from "vitest";
import { decodeJwt } from "./transform";

const SAMPLE_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

describe("decodeJwt", () => {
  it("decodes header and payload", () => {
    const result = decodeJwt(SAMPLE_JWT);
    expect(result.error).toBeNull();
    expect(result.header).toEqual({ alg: "HS256", typ: "JWT" });
    expect(result.payload).toEqual({ sub: "1234567890", name: "John Doe", iat: 1516239022 });
  });

  it("returns the raw signature segment", () => {
    const result = decodeJwt(SAMPLE_JWT);
    expect(result.signature).toBe("SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c");
  });

  it("computes issuedAt from iat", () => {
    const result = decodeJwt(SAMPLE_JWT);
    expect(result.issuedAt).toBe(new Date(1516239022 * 1000).toISOString());
  });

  it("flags an expired token", () => {
    const header = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ exp: 1 })).toString("base64url");
    const result = decodeJwt(`${header}.${payload}.sig`);
    expect(result.isExpired).toBe(true);
  });

  it("returns empty result for empty input without error", () => {
    expect(decodeJwt("   ")).toEqual({
      header: null,
      payload: null,
      signature: null,
      isExpired: null,
      expiresAt: null,
      issuedAt: null,
      error: null,
    });
  });

  it("errors on malformed token structure", () => {
    const result = decodeJwt("not.a.valid.jwt.token");
    expect(result.error).toBeTruthy();
  });

  it("errors on unparsable header", () => {
    const result = decodeJwt("!!!.eyJhIjoxfQ.sig");
    expect(result.error).toBeTruthy();
  });
});

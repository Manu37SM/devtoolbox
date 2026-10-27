import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { base64Url, encodeJwt } from "./transform";

const base = { algorithm: "HS256", secret: "your-256-bit-secret", addIssuedAt: false, expiresIn: "none", keyId: "" } as const;
const decode = (part: string) => JSON.parse(Buffer.from(part, "base64url").toString("utf8"));

describe("encodeJwt", () => {
  it("reproduces the well-known jwt.io HS256 token", async () => {
    const r = await encodeJwt('{"sub":"1234567890","name":"John Doe","iat":1516239022}', base);
    expect(r.output).toBe(
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
    );
  });

  it.each([["HS256", "sha256"], ["HS384", "sha384"], ["HS512", "sha512"]] as const)("signs correctly with %s", async (alg, node) => {
    const token = (await encodeJwt('{"a":1}', { ...base, algorithm: alg })).output;
    const [h, p, s] = token.split(".");
    expect(decode(h!)).toEqual({ alg, typ: "JWT" });
    expect(s).toBe(createHmac(node, base.secret).update(`${h}.${p}`).digest("base64url"));
  });

  it("adds iat and exp relative to a fixed clock, without overriding existing claims", async () => {
    const opts = { ...base, addIssuedAt: true, expiresIn: "1h" } as const;
    const token = (await encodeJwt('{"a":1}', opts, 0, 1_000)).output;
    expect(decode(token.split(".")[1]!)).toEqual({ a: 1, iat: 1000, exp: 4600 });
    const kept = (await encodeJwt('{"iat":5,"exp":9}', opts, 0, 1_000)).output;
    expect(decode(kept.split(".")[1]!)).toEqual({ iat: 5, exp: 9 });
  });

  it("includes kid in the header when provided", async () => {
    const token = (await encodeJwt('{"a":1}', { ...base, keyId: " key-1 " })).output;
    expect(decode(token.split(".")[0]!)).toEqual({ alg: "HS256", typ: "JWT", kid: "key-1" });
  });

  it("handles unicode payloads", async () => {
    const token = (await encodeJwt('{"name":"Zoë 🔑"}', base)).output;
    expect(decode(token.split(".")[1]!).name).toBe("Zoë 🔑");
  });

  it("validates input", async () => {
    expect((await encodeJwt("{oops", base)).error?.message).toMatch(/not valid JSON/);
    expect((await encodeJwt("[1]", base)).error?.message).toMatch(/object/);
    expect((await encodeJwt('{"a":1}', { ...base, secret: "" })).error?.message).toMatch(/secret/);
    expect(await encodeJwt("  ", base)).toEqual({ output: "", error: null });
  });
});

describe("base64Url", () => {
  it("uses the URL-safe alphabet without padding", () => {
    expect(base64Url(Uint8Array.from([0xfb, 0xff, 0xfe]))).toBe("-__-");
    expect(base64Url(Uint8Array.from([1]))).toBe("AQ");
  });
});

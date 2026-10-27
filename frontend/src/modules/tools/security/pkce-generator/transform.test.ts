import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { base64Url, challengeFor, generatePkce, makeVerifier, sha256 } from "./transform";

const hex = (b: Uint8Array) => Buffer.from(b).toString("hex");

describe("sha256", () => {
  it("matches known vectors", () => {
    expect(hex(sha256(new Uint8Array()))).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(hex(sha256(new TextEncoder().encode("abc")))).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
  it("matches node:crypto across padding boundaries", () => {
    for (const n of [0, 1, 55, 56, 63, 64, 65, 119, 120, 1000]) {
      const data = Uint8Array.from({ length: n }, (_, i) => (i * 7 + 3) & 255);
      expect(hex(sha256(data))).toBe(createHash("sha256").update(data).digest("hex"));
    }
  });
});

describe("PKCE", () => {
  it("reproduces the RFC 7636 appendix B example", () => {
    expect(challengeFor("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });
  it("generates verifiers of the right length from the unreserved set", () => {
    for (const len of [43, 64, 128]) expect(makeVerifier(len)).toMatch(new RegExp(`^[A-Za-z0-9\\-._~]{${len}}$`));
  });
  it("rejection sampling is deterministic and unbiased for the injected source", () => {
    // 255 is rejected (256 - 256 % 66 = 198 is the cut-off), so only the first byte ≥ 198 is skipped
    expect(makeVerifier(3, () => Uint8Array.from([255, 0, 1, 2, 250, 198, 197, 0]))).toBe("ABC");
  });
  it("base64url has no padding or unsafe chars", () => {
    expect(base64Url(Uint8Array.from([0xfb, 0xff]))).toBe("-_8");
  });
  it("outputs a consistent verifier/challenge pair and accepts a custom verifier", () => {
    const out = generatePkce("", { length: 64 }).output;
    const v = /code_verifier {3}(\S+)/.exec(out)![1]!;
    const c = /code_challenge {2}(\S+)/.exec(out)![1]!;
    expect(v).toHaveLength(64);
    expect(c).toBe(createHash("sha256").update(v).digest("base64url"));
    const custom = generatePkce("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk", { length: 64 }).output;
    expect(custom).toContain("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });
  it("clamps length and rejects invalid custom verifiers", () => {
    expect(/code_verifier {3}(\S+)/.exec(generatePkce("", { length: 5 }).output)![1]).toHaveLength(43);
    expect(/code_verifier {3}(\S+)/.exec(generatePkce("", { length: 999 }).output)![1]).toHaveLength(128);
    expect(generatePkce("short", { length: 64 }).error).not.toBeNull();
    expect(generatePkce("a".repeat(43) + "!", { length: 64 }).error).not.toBeNull();
  });
});

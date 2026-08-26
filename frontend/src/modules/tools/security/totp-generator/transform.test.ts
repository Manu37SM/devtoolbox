import { describe, expect, it } from "vitest";
import { base32Decode, base32Encode, generateTotp, hotp } from "./transform";
import type { TotpGeneratorOptions } from "./schema";

describe("generateTotp — RFC 6238 test vectors", () => {
  it("matches the SHA-1 test vector (94287082)", async () => {
    const secret = base32Encode(new TextEncoder().encode("12345678901234567890"));
    const options: TotpGeneratorOptions = { secret, digits: 8, period: 30, algorithm: "SHA-1" };
    const result = await generateTotp(options, 59);
    expect(result.error).toBeNull();
    expect(result.code).toBe("94287082");
  });

  it("matches the SHA-256 test vector (46119246)", async () => {
    const secret = base32Encode(new TextEncoder().encode("12345678901234567890123456789012"));
    const options: TotpGeneratorOptions = { secret, digits: 8, period: 30, algorithm: "SHA-256" };
    const result = await generateTotp(options, 59);
    expect(result.code).toBe("46119246");
  });

  it("matches the SHA-512 test vector (90693936)", async () => {
    const secret = base32Encode(
      new TextEncoder().encode("1234567890123456789012345678901234567890123456789012345678901234"),
    );
    const options: TotpGeneratorOptions = { secret, digits: 8, period: 30, algorithm: "SHA-512" };
    const result = await generateTotp(options, 59);
    expect(result.code).toBe("90693936");
  });

  it("computes seconds remaining in the current period", async () => {
    const secret = base32Encode(new TextEncoder().encode("12345678901234567890"));
    const options: TotpGeneratorOptions = { secret, digits: 6, period: 30, algorithm: "SHA-1" };
    const result = await generateTotp(options, 65);
    expect(result.secondsRemaining).toBe(25);
  });
});

describe("base32Decode / base32Encode", () => {
  it("round-trips arbitrary bytes", () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5, 250, 251]);
    expect(Array.from(base32Decode(base32Encode(bytes)))).toEqual(Array.from(bytes));
  });

  it("is case-insensitive and ignores padding", () => {
    const upper = base32Decode("JBSWY3DPEHPK3PXP");
    const lower = base32Decode("jbswy3dpehpk3pxp");
    expect(Array.from(upper)).toEqual(Array.from(lower));
  });

  it("throws on an invalid character", () => {
    expect(() => base32Decode("!!!invalid!!!")).toThrow();
  });
});

describe("generateTotp — error handling", () => {
  it("errors on an empty secret", async () => {
    const result = await generateTotp({ secret: "", digits: 6, period: 30, algorithm: "SHA-1" }, 59);
    expect(result.error).not.toBeNull();
  });

  it("errors on an invalid base32 secret", async () => {
    const result = await generateTotp({ secret: "not valid base32 !!!", digits: 6, period: 30, algorithm: "SHA-1" }, 59);
    expect(result.error).not.toBeNull();
  });
});

describe("hotp", () => {
  it("produces a 6-digit zero-padded code", async () => {
    const key = new TextEncoder().encode("12345678901234567890");
    const code = await hotp(key, 1, 6, "SHA-1");
    expect(code).toHaveLength(6);
    expect(/^\d{6}$/.test(code)).toBe(true);
  });
});

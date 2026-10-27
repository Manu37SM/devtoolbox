import { describe, expect, it } from "vitest";
import { checkLuhn, detectBrand, generateLuhn, luhnCheck, luhnCheckDigit } from "./transform";

const validate = { mode: "validate", brand: "visa", count: 3, mask: false } as const;

describe("luhnCheck", () => {
  it.each(["4111111111111111", "5555555555554444", "378282246310005", "6011111111111117", "79927398713"])("accepts %s", (n) => {
    expect(luhnCheck(n)).toBe(true);
  });
  it.each(["4111111111111112", "79927398710", "1234567890123456", "abc", ""])("rejects %j", (n) => {
    expect(luhnCheck(n)).toBe(false);
  });
  it("computes check digits", () => {
    expect(luhnCheckDigit("7992739871")).toBe(3);
    expect(luhnCheckDigit("411111111111111")).toBe(1);
  });
});

describe("detectBrand", () => {
  it.each([
    ["4111111111111111", "Visa"], ["5555555555554444", "Mastercard"], ["2223000048400011", "Mastercard"], ["378282246310005", "American Express"],
    ["6011111111111117", "Discover"], ["30569309025904", "Diners Club"], ["3530111333300000", "JCB"], ["6200000000000005", "UnionPay"],
  ])("%s is %s", (n, name) => {
    expect(detectBrand(n)?.name).toBe(name);
  });
  it("returns undefined for unknown prefixes", () => {
    expect(detectBrand("9999999999999995")).toBeUndefined();
  });
});

describe("generateLuhn", () => {
  it("makes Luhn-valid numbers with the right prefix and length for every brand", () => {
    const expectations: Record<string, { len: number; name: RegExp }> = {
      visa: { len: 16, name: /Visa/ }, mastercard: { len: 16, name: /Mastercard/ }, amex: { len: 15, name: /American/ },
      discover: { len: 16, name: /Discover/ }, diners: { len: 14, name: /Diners/ }, jcb: { len: 16, name: /JCB/ }, rupay: { len: 16, name: /RuPay/ }, unionpay: { len: 16, name: /UnionPay/ },
    };
    for (const [id, e] of Object.entries(expectations)) {
      for (let i = 0; i < 25; i++) {
        const n = generateLuhn(id as never);
        expect(n).toHaveLength(e.len);
        expect(luhnCheck(n)).toBe(true);
        expect(detectBrand(n)?.name).toMatch(e.name);
      }
    }
  });
});

describe("checkLuhn", () => {
  it("validates spaced and dashed input, naming the network", () => {
    const out = checkLuhn("4111 1111-1111 1111", validate).output;
    expect(out).toBe("✓ 4111 1111 1111 1111\n    Luhn OK · Visa · 16 digits");
  });
  it("masks all but the last four digits when asked", () => {
    expect(checkLuhn("4111111111111111", { ...validate, mask: true }).output.split("\n")[0]).toBe("✓ •••• •••• •••• 1111");
  });
  it("suggests the correct last digit for a failing number", () => {
    const out = checkLuhn("4111111111111112", validate).output;
    expect(out).toContain("✗");
    expect(out).toContain("should be 1");
  });
  it("flags bad lengths and unusual lengths per network", () => {
    expect(checkLuhn("1234", validate).output).toMatch(/Expected 8–19 digits/);
    expect(checkLuhn("4222222222222", validate).output).toContain("Visa"); // 13-digit Visa is fine
    expect(checkLuhn("378282246310005", validate).output).not.toContain("unusual");
  });
  it("generates the requested count and handles empty validate input", () => {
    expect(checkLuhn("", { ...validate, mode: "generate", count: 4 }).output.split("\n")).toHaveLength(4);
    expect(checkLuhn("", validate)).toEqual({ output: "", error: null });
  });
});

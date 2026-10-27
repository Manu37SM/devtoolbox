import { describe, expect, it } from "vitest";
import { gstinCheckChar, validateIndianId, verhoeffCheckDigit, verhoeffValid } from "./transform";

const o = { mask: false } as const;

describe("Verhoeff", () => {
  it("matches the Wikipedia example (236 -> check digit 3)", () => {
    expect(verhoeffCheckDigit("236")).toBe(3);
    expect(verhoeffValid("2363")).toBe(true);
    expect(verhoeffValid("2364")).toBe(false);
  });
  it("detects every single-digit error and adjacent transposition", () => {
    const base = "23456789012" + verhoeffCheckDigit("23456789012");
    expect(verhoeffValid(base)).toBe(true);
    for (let i = 0; i < base.length; i++) {
      for (const d of "0123456789") {
        if (d === base[i]) continue;
        expect(verhoeffValid(base.slice(0, i) + d + base.slice(i + 1))).toBe(false);
      }
    }
    for (let i = 0; i < base.length - 1; i++) {
      if (base[i] === base[i + 1]) continue;
      const swapped = base.slice(0, i) + base[i + 1] + base[i] + base.slice(i + 2);
      expect(verhoeffValid(swapped)).toBe(false);
    }
  });
});

describe("GSTIN", () => {
  it("validates the widely published sample 27AAPFU0939F1ZV", () => {
    expect(gstinCheckChar("27AAPFU0939F1Z")).toBe("V");
  });
});

describe("validateIndianId", () => {
  it("accepts a generated Aadhaar-shaped number and rejects a corrupted one", () => {
    const body = "23456789012";
    const good = body + verhoeffCheckDigit(body);
    expect(validateIndianId(good, o).output).toMatch(/^✓ Aadhaar/);
    const bad = body + ((verhoeffCheckDigit(body) + 1) % 10);
    expect(validateIndianId(bad, o).output).toMatch(/^✗ Aadhaar[\s\S]*Verhoeff/);
    expect(validateIndianId("123456789012", o).output).toContain("never start with 0 or 1");
  });
  it("masks Aadhaar and PAN by default", () => {
    const body = "23456789012";
    const good = body + verhoeffCheckDigit(body);
    expect(validateIndianId(good, { mask: true }).output).toContain(`XXXX XXXX ${good.slice(-4)}`);
    expect(validateIndianId("ABCPE1234F", { mask: true }).output).toContain("ABXXXXX4F");
  });
  it("decodes PAN holder type", () => {
    expect(validateIndianId("ABCPE1234F", o).output).toContain("Individual");
    expect(validateIndianId("ABCCE1234F", o).output).toContain("Company");
    expect(validateIndianId("ABCXE1234F", o).output).toMatch(/^✗ PAN/);
  });
  it("validates GSTIN checksum and state", () => {
    const out = validateIndianId("27AAPFU0939F1ZV", o).output;
    expect(out).toMatch(/^✓ GSTIN/);
    expect(out).toContain("Maharashtra");
    expect(out).toContain("AAPFU0939F");
    expect(validateIndianId("27AAPFU0939F1ZA", o).output).toMatch(/^✗ GSTIN[\s\S]*expected V/);
    expect(validateIndianId("99AAPFU0939F1Z" + gstinCheckChar("99AAPFU0939F1Z"), o).output).toMatch(/^✗ GSTIN[\s\S]*Unknown state/);
  });
  it("recognises IFSC and unknown strings", () => {
    expect(validateIndianId("HDFC0001234", o).output).toContain("Bank code HDFC, branch code 001234");
    expect(validateIndianId("hdfc 0001234", o).output).toMatch(/^✓ IFSC/);
    expect(validateIndianId("hello", o).output).toMatch(/^✗ hello/);
    expect(validateIndianId("", o)).toEqual({ output: "", error: null });
  });
});

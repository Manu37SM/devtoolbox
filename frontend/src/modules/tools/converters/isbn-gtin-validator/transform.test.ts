import { describe, expect, it } from "vitest";
import { analyze, gs1CheckDigit, isbn10CheckChar, isbn10To13, isbn13To10, validateCodes } from "./transform";

describe("check digits (independently verified)", () => {
  it("GS1", () => {
    expect(gs1CheckDigit("978030640615")).toBe(7);
    expect(gs1CheckDigit("400638133393")).toBe(1);
    expect(gs1CheckDigit("03600029145")).toBe(2);
    expect(gs1CheckDigit("9638507")).toBe(4);
  });
  it("ISBN-10 incl. X", () => {
    expect(isbn10CheckChar("030640615")).toBe("2");
    expect(isbn10CheckChar("080442957")).toBe("X");
  });
  it("converts between ISBN-10 and ISBN-13", () => {
    expect(isbn10To13("0306406152")).toBe("9780306406157");
    expect(isbn13To10("9780306406157")).toBe("0306406152");
    expect(isbn13To10("9791234567896")).toBeNull();
  });
});

describe("analyze", () => {
  it("recognizes each type", () => {
    expect(analyze("0-306-40615-2", true)).toMatchObject({ kind: "ISBN-10", valid: true });
    expect(analyze("978-0-306-40615-7", true)).toMatchObject({ kind: expect.stringContaining("ISBN-13"), valid: true });
    expect(analyze("4006381333931", true)).toMatchObject({ kind: "EAN-13", valid: true });
    expect(analyze("036000291452", true)).toMatchObject({ kind: "UPC-A", valid: true });
    expect(analyze("96385074", true)).toMatchObject({ kind: "EAN-8", valid: true });
  });
  it("reports the expected digit on failure", () => {
    expect(analyze("4006381333932", true)).toMatchObject({ valid: false, expected: "1" });
    expect(analyze("0306406153", true)).toMatchObject({ valid: false, expected: "2" });
  });
  it("rejects garbage", () => {
    expect(() => analyze("12345", true)).toThrow();
    expect(() => analyze("abcdefghij", true)).toThrow();
    expect(() => analyze("12345678X", true)).toThrow();
  });
  it("accepts a lowercase x check character", () => {
    expect(analyze("080442957x", false)).toMatchObject({ kind: "ISBN-10", valid: true });
  });
});

describe("validateCodes", () => {
  it("summarizes", () => {
    const r = validateCodes("0306406152\n4006381333932\nxyz", { convertIsbn: true });
    expect(r.output).toContain("ISBN-13: 9780306406157");
    expect(r.output).toContain("expected 1");
    expect(r.output).toContain("1 of 3 valid");
    expect(r.error?.line).toBe(3);
  });
});

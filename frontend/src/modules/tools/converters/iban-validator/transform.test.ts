import { describe, expect, it } from "vitest";
import { IBAN_LENGTHS, checkDigits, convertIban, groupIban, mod97, validateIban } from "./transform";

const VALID = [
  "GB82 WEST 1234 5698 7654 32", "DE89 3704 0044 0532 0130 00", "FR14 2004 1010 0505 0001 3M02 606", "NL91 ABNA 0417 1643 00",
  "ES91 2100 0418 4502 0005 1332", "IT60 X054 2811 1010 0000 0123 456", "CH93 0076 2011 6238 5295 7", "BE68 5390 0754 7034",
];

describe("validateIban", () => {
  it.each(VALID)("accepts %s", (iban) => {
    const r = validateIban(iban);
    expect(r.valid).toBe(true);
    expect(r.compact.length).toBe(IBAN_LENGTHS[r.country]);
  });

  it("is case- and space-insensitive", () => {
    expect(validateIban("gb82west12345698765432").valid).toBe(true);
  });

  it("detects a single wrong digit and suggests the right check digits", () => {
    const r = validateIban("GB83 WEST 1234 5698 7654 32");
    expect(r.valid).toBe(false);
    expect(r.problem).toContain("should be 82");
  });

  it("detects transposed characters", () => {
    expect(validateIban("GB82 WEST 1234 5698 7645 32").valid).toBe(false);
  });

  it("checks length and country", () => {
    expect(validateIban("GB82 WEST 1234 5698 7654 3").problem).toMatch(/22 characters.*has 21/);
    expect(validateIban("XX82 WEST 1234 5698 7654 32").problem).toMatch(/not a country/);
    expect(validateIban("1234").problem).toMatch(/country code/);
  });
});

describe("helpers", () => {
  it("mod97 returns 1 for valid IBANs", () => {
    for (const iban of VALID) expect(mod97(iban.replace(/\s/g, ""))).toBe(1);
  });
  it("checkDigits regenerates the published check digits", () => {
    expect(checkDigits("GB", "WEST12345698765432")).toBe("82");
    expect(checkDigits("DE", "370400440532013000")).toBe("89");
  });
  it("groups in fours", () => {
    expect(groupIban("GB82WEST12345698765432")).toBe("GB82 WEST 1234 5698 7654 32");
  });
  it("registry lengths include no impossible values", () => {
    for (const n of Object.values(IBAN_LENGTHS)) expect(n).toBeGreaterThanOrEqual(15);
  });
});

describe("convertIban", () => {
  it("reports each line separately", () => {
    const out = convertIban("DE89370400440532013000\nDE00370400440532013000", { format: "grouped" }).output;
    expect(out).toContain("✓ DE89 3704 0044 0532 0130 00");
    expect(out).toContain("BBAN 370400440532013000");
    expect(out).toContain("✗ DE00 3704");
  });
  it("can leave the IBAN ungrouped and handles empty input", () => {
    expect(convertIban("de89 3704 0044 0532 0130 00", { format: "compact" }).output).toContain("✓ DE89370400440532013000");
    expect(convertIban("", { format: "grouped" })).toEqual({ output: "", error: null });
  });
});

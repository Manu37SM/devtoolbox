import { describe, expect, it } from "vitest";
import { generateSecurityTxt } from "./transform";

const o = { expiresInDays: 365, baseDate: "2026-01-01T00:00:00Z" };

describe("generateSecurityTxt", () => {
  it("builds a valid file with Expires and normalizes emails", () => {
    const r = generateSecurityTxt("contact: sec@example.com\npolicy: https://example.com/policy\ncanonical: https://example.com/.well-known/security.txt\nlanguage: en, hi", o);
    expect(r.error).toBeNull();
    expect(r.output).toContain("Contact: mailto:sec@example.com");
    expect(r.output).toContain("Expires: 2027-01-01T00:00:00Z");
    expect(r.output).toContain("Preferred-Languages: en, hi");
    expect(r.output.trim().split("\n").pop()).toMatch(/^Canonical:/);
  });
  it("requires a contact and https URIs", () => {
    expect(generateSecurityTxt("policy: https://e.com/p", o).error?.message).toMatch(/Contact/);
    expect(generateSecurityTxt("contact: sec@e.com\npolicy: http://e.com", o).error).toMatchObject({ line: 2 });
    expect(generateSecurityTxt("contact: nobody", o).error?.message).toMatch(/email/);
    expect(generateSecurityTxt("contact: a@b.co\nfoo: bar", o).error?.message).toMatch(/Unknown/);
  });
  it("handles empty input and bad dates", () => {
    expect(generateSecurityTxt("", o)).toEqual({ output: "", error: null });
    expect(generateSecurityTxt("contact: a@b.co", { ...o, baseDate: "zzz" }).error?.message).toMatch(/baseDate/);
  });
});

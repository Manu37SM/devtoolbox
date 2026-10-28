import { describe, expect, it } from "vitest";
import { ibanValid, luhn, maskPii } from "./transform";

const all = { style: "partial" as const, email: true, phone: true, card: true, ssn: true, ip: true, idNumbers: true, iban: true, report: false };
const m = (s: string, o = {}) => maskPii(s, { ...all, ...o }).output;

describe("validators", () => {
  it("luhn", () => { expect(luhn("4111111111111111")).toBe(true); expect(luhn("4111111111111112")).toBe(false); });
  it("iban", () => { expect(ibanValid("GB82 WEST 1234 5698 7654 32")).toBe(true); expect(ibanValid("GB82 WEST 1234 5698 7654 33")).toBe(false); });
});

describe("maskPii", () => {
  it("masks emails", () => {
    expect(m("mail john.doe@example.com now")).toBe("mail j*******@example.com now");
    expect(m("a@b.io", { style: "label" })).toBe("[EMAIL]");
  });
  it("masks only Luhn-valid cards", () => {
    expect(m("card 4111 1111 1111 1111 ok")).toBe("card **** **** **** 1111 ok");
    expect(m("order 4111 1111 1111 1112")).toBe("order 4111 1111 1111 1112");
  });
  it("ssn, ip, pan, aadhaar, iban", () => {
    expect(m("123-45-6789")).toBe("***-**-6789");
    expect(m("000-12-3456")).toBe("000-12-3456");
    expect(m("host 192.168.4.77")).toBe("host 192.168.*.*");
    expect(m("ABCDE1234F")).toBe("AB******4F");
    expect(m("2345 6789 0123")).toBe("**** **** 0123");
    expect(m("GB82 WEST 1234 5698 7654 32")).toMatch(/^GB82\*+5432$/);
  });
  it("phones", () => {
    expect(m("call +1 415-555-2671")).toMatch(/\*+71$/);
    expect(m("call +919876543210", { style: "label" })).toBe("call [PHONE]");
  });
  it("toggles and report", () => {
    expect(m("a@b.io", { email: false })).toBe("a@b.io");
    expect(m("a@b.io 1.2.3.4", { report: true })).toContain("EMAIL: 1\nIP: 1");
    expect(m("nothing", { report: true })).toContain("No PII found");
    expect(m("a@b.io", { style: "stars" })).toBe("******");
  });
});

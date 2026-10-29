import { describe, expect, it } from "vitest";
import { CODE_PAGES } from "./codepages";
import { fromEbcdic, runEbcdicConverter, toEbcdic } from "./transform";
import { hexToBytes, bytesToHex } from "@/lib/byte-input";

describe("code pages", () => {
  it("have 256 distinct characters each", () => {
    for (const [cp, t] of Object.entries(CODE_PAGES)) { expect([...t]).toHaveLength(256); expect(new Set(t).size, cp).toBe(256); }
  });
  it("1047 differs from 037 only in the six documented positions", () => {
    const diffs = [...CODE_PAGES["037"]!].map((c, i) => (c !== CODE_PAGES["1047"]![i] ? i.toString(16).toUpperCase() : null)).filter(Boolean);
    expect(diffs).toEqual(["5F", "AD", "B0", "BA", "BB", "BD"]);
    expect(CODE_PAGES["1047"]![0xad]).toBe("[");
    expect(CODE_PAGES["037"]![0xba]).toBe("[");
  });
});

describe("conversion (matches Python codecs)", () => {
  it("encodes cp037", () => expect(bytesToHex(toEbcdic("Hello, World!", "037", "nl").bytes).toLowerCase()).toBe("c8859393966b40e6969993845a"));
  it("has the euro sign in 1140 and umlauts in 273", () => {
    expect(bytesToHex(toEbcdic("€", "1140", "nl").bytes)).toBe("9F");
    expect(bytesToHex(toEbcdic("ä{", "273", "nl").bytes)).toBe("C043");
  });
  it("maps newlines per option and decodes back", () => {
    expect(bytesToHex(toEbcdic("A\nB", "037", "nl").bytes)).toBe("C115C2");
    expect(bytesToHex(toEbcdic("A\nB", "037", "lf").bytes)).toBe("C125C2");
    expect(fromEbcdic(hexToBytes("C115C2"), "037", "nl")).toBe("A\nB");
  });
  it("reports characters missing from the code page", () => {
    const out = runEbcdicConverter("€", { direction: "to-ebcdic", codePage: "037", newline: "nl" }).output;
    expect(out).toContain('Not in code page 037 (written as 0x6F "?"): "€"');
  });
  it("decodes hex and shows control characters", () => {
    expect(runEbcdicConverter("C8 85 93 93 96 05 07", { direction: "from-ebcdic", codePage: "037", newline: "nl" }).output).toBe("Hello\t\\x7f");
    expect(runEbcdicConverter("zz", { direction: "from-ebcdic", codePage: "037", newline: "nl" }).error?.message).toContain("hex");
  });
});

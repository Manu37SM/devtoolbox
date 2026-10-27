import { describe, expect, it } from "vitest";
import { convertNato } from "./transform";

const enc = { mode: "text-to-nato", icaoDigits: false } as const;
const dec = { mode: "nato-to-text", icaoDigits: false } as const;

describe("convertNato", () => {
  it("spells letters and separates words with ' / '", () => {
    expect(convertNato("Hi Bo", enc).output).toBe("Hotel India / Bravo Oscar");
  });

  it("spells digits plainly or the ICAO way", () => {
    expect(convertNato("A9", enc).output).toBe("Alfa Nine");
    expect(convertNato("A95", { ...enc, icaoDigits: true }).output).toBe("Alfa Niner Fife");
  });

  it("passes punctuation through", () => {
    expect(convertNato("a-b", enc).output).toBe("Alfa - Bravo");
  });

  it("decodes, case-insensitively, including common spelling variants", () => {
    expect(convertNato("hotel INDIA / alpha juliet xray", dec).output).toBe("HI AJX");
    expect(convertNato("Tree Fower Niner", dec).output).toBe("349");
  });

  it("errors on unknown words", () => {
    expect(convertNato("Alfa Banana", dec).error?.message).toContain("Banana");
  });

  it("round-trips", () => {
    const e = convertNato("Dev Toolbox 2026", enc).output;
    expect(convertNato(e, dec).output).toBe("DEV TOOLBOX 2026");
  });

  it("handles empty input", () => {
    expect(convertNato("  ", enc)).toEqual({ output: "", error: null });
  });
});

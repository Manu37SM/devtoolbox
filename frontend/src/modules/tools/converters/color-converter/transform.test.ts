import { describe, expect, it } from "vitest";
import { convertColor } from "./transform";

describe("convertColor", () => {
  it("parses 6-digit hex and converts to rgb/hsl/cmyk", () => {
    const result = convertColor("#ff0000");
    expect(result.rgb).toBe("rgb(255, 0, 0)");
    expect(result.hsl).toBe("hsl(0, 100%, 50%)");
    expect(result.cmyk).toBe("cmyk(0%, 100%, 100%, 0%)");
  });

  it("parses 3-digit hex shorthand", () => {
    const result = convertColor("#0f0");
    expect(result.hex).toBe("#00ff00");
  });

  it("parses rgb() input", () => {
    const result = convertColor("rgb(0, 0, 255)");
    expect(result.hex).toBe("#0000ff");
  });

  it("parses hsl() input", () => {
    const result = convertColor("hsl(0, 100%, 50%)");
    expect(result.hex).toBe("#ff0000");
  });

  it("handles black correctly for cmyk (avoids divide by zero)", () => {
    const result = convertColor("#000000");
    expect(result.cmyk).toBe("cmyk(0%, 0%, 0%, 100%)");
  });

  it("returns empty result for empty input", () => {
    expect(convertColor("")).toEqual({ hex: "", rgb: "", hsl: "", cmyk: "", error: null });
  });

  it("errors on unparsable input", () => {
    const result = convertColor("not-a-color");
    expect(result.error).toBeTruthy();
  });

  it("accepts hex without a leading #", () => {
    const result = convertColor("ff0000");
    expect(result.hex).toBe("#ff0000");
  });
});

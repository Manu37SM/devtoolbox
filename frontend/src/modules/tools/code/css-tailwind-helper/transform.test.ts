import { describe, expect, it } from "vitest";
import { convertCssTailwind, cssToTailwind, tailwindToCss } from "./transform";

describe("cssToTailwind", () => {
  it("maps spacing, color, display, and border-radius on-scale values", () => {
    const result = cssToTailwind("margin: 16px; color: #ef4444; display: flex; border-radius: 8px;");
    expect(result.error).toBeNull();
    expect(result.output).toBe("m-4 text-red-500 flex rounded-lg");
  });

  it("falls back to arbitrary-value syntax for off-scale values", () => {
    const result = cssToTailwind("margin: 17px;");
    expect(result.output).toBe("m-[17px]");
  });

  it("maps font-size and font-weight scales", () => {
    const result = cssToTailwind("font-size: 1.125rem; font-weight: 700;");
    expect(result.output).toBe("text-lg font-bold");
  });

  it("maps flex/alignment keyword properties", () => {
    const result = cssToTailwind("display: flex; flex-direction: column; align-items: center; justify-content: space-between;");
    expect(result.output).toBe("flex flex-col items-center justify-between");
  });

  it("maps width/height keyword values", () => {
    expect(cssToTailwind("width: 100%;").output).toBe("w-full");
    expect(cssToTailwind("height: auto;").output).toBe("h-auto");
  });

  it("lists unrecognized declarations instead of dropping them", () => {
    const result = cssToTailwind("transform: rotate(10deg);");
    expect(result.output).toContain("No Tailwind mapping for: transform: rotate(10deg)");
  });

  it("accepts a full rule with selector and braces", () => {
    const result = cssToTailwind(".card {\n  padding: 8px;\n  display: block;\n}");
    expect(result.output).toBe("p-2 block");
  });

  it("returns empty output for empty input", () => {
    expect(cssToTailwind("")).toEqual({ output: "", error: null });
  });

  it("errors when no declarations are found at all", () => {
    const result = cssToTailwind(".card {}");
    expect(result.error).not.toBeNull();
  });
});

describe("tailwindToCss", () => {
  it("expands named-scale classes back to CSS", () => {
    const result = tailwindToCss("m-4 text-red-500 flex rounded-lg");
    expect(result.error).toBeNull();
    expect(result.output).toContain("margin: 1rem;");
    expect(result.output).toContain("color: #ef4444;");
    expect(result.output).toContain("display: flex;");
    expect(result.output).toContain("border-radius: 0.5rem;");
  });

  it("expands arbitrary-value classes, disambiguating text-[] by shape", () => {
    const result = tailwindToCss("w-[123px] text-[#112233] text-[22px] border-[#ff0000] border-[2px]");
    expect(result.output).toContain("width: 123px;");
    expect(result.output).toContain("color: #112233;");
    expect(result.output).toContain("font-size: 22px;");
    expect(result.output).toContain("border-color: #ff0000;");
    expect(result.output).toContain("border-width: 2px;");
  });

  it("lists unrecognized classes instead of dropping them", () => {
    const result = tailwindToCss("hover:underline");
    expect(result.output).toContain("No CSS mapping for: hover:underline");
  });

  it("returns empty output for empty input", () => {
    expect(tailwindToCss("")).toEqual({ output: "", error: null });
  });
});

describe("convertCssTailwind", () => {
  it("dispatches based on direction", () => {
    expect(convertCssTailwind("margin: 16px;", "css-to-tailwind").output).toBe("m-4");
    expect(convertCssTailwind("m-4", "tailwind-to-css").output).toContain("margin: 1rem;");
  });
});

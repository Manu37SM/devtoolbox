import { describe, expect, it } from "vitest";
import { optimizeSvg } from "./transform";
import type { SvgOptimizerOptions } from "./schema";

const base: SvgOptimizerOptions = { pluginsPreset: "default", removeViewBox: false, multipass: true };

const SAMPLE_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<!-- a comment -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <title>Sample</title>
  <rect x="10" y="10" width="50" height="50" fill="#ff0000" />
</svg>`;

describe("optimizeSvg — default preset", () => {
  it("strips comments and reduces byte size", () => {
    const result = optimizeSvg(SAMPLE_SVG, base);
    expect(result.error).toBeNull();
    expect(result.output).not.toContain("<!--");
    expect(result.outputBytes).toBeLessThan(result.inputBytes);
  });

  it("preserves viewBox by default", () => {
    const result = optimizeSvg(SAMPLE_SVG, base);
    expect(result.output).toContain("viewBox");
  });

  it("returns empty output for empty input without error", () => {
    expect(optimizeSvg("", base)).toEqual({ output: "", error: null, inputBytes: 0, outputBytes: 0 });
  });

  it("returns a structured error for malformed SVG/XML", () => {
    const result = optimizeSvg("<svg><rect></svg>", base);
    expect(result.error).not.toBeNull();
    expect(result.output).toBe("");
  });
});

describe("optimizeSvg — removeViewBox option", () => {
  it("removes viewBox when explicitly requested", () => {
    const result = optimizeSvg(SAMPLE_SVG, { ...base, removeViewBox: true });
    expect(result.error).toBeNull();
    expect(result.output).not.toContain("viewBox");
  });
});

describe("optimizeSvg — safe preset", () => {
  it("still strips comments and metadata", () => {
    const result = optimizeSvg(SAMPLE_SVG, { ...base, pluginsPreset: "safe" });
    expect(result.error).toBeNull();
    expect(result.output).not.toContain("<!--");
  });
});

describe("optimizeSvg — minimal preset", () => {
  it("strips comments but leaves geometry/attributes untouched", () => {
    const result = optimizeSvg(SAMPLE_SVG, { ...base, pluginsPreset: "minimal" });
    expect(result.error).toBeNull();
    expect(result.output).not.toContain("<!--");
    // minimal preset shouldn't shorten fill="#ff0000" to fill="red" or similar,
    // since convertColors isn't in its plugin list.
    expect(result.output).toContain("#ff0000");
  });

  it("still removes the <title> element via preset-default equivalents only when selected — minimal keeps it", () => {
    const result = optimizeSvg(SAMPLE_SVG, { ...base, pluginsPreset: "minimal" });
    // minimal doesn't include removeTitle, so it should be preserved.
    expect(result.output).toContain("Sample");
  });
});

describe("optimizeSvg — multipass option", () => {
  it("produces valid output with multipass disabled", () => {
    const result = optimizeSvg(SAMPLE_SVG, { ...base, multipass: false });
    expect(result.error).toBeNull();
    expect(result.output.length).toBeGreaterThan(0);
  });
});

import { describe, expect, it } from "vitest";
import { optimizeSvg } from "./transform";
import type { SvgOptimizerOptions } from "./schema";

import { svgOptimizerOptionsSchema } from "./schema";

const base: SvgOptimizerOptions = svgOptimizerOptionsSchema.parse({});

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

    expect(result.output).toContain("#ff0000");
  });

  it("still removes the <title> element via preset-default equivalents only when selected — minimal keeps it", () => {
    const result = optimizeSvg(SAMPLE_SVG, { ...base, pluginsPreset: "minimal" });

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

const ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><title>Star</title><defs><linearGradient id="grad"><stop offset="0" stop-color="#ff0000"/></linearGradient></defs><path fill="#ff0000" d="M1.123456 2.987654L10.5 20.25z"/><rect class="a" fill="url(#grad)" width="2" height="2"/></svg>`;

describe("optimizeSvg — tool options", () => {
  it("keeps the title by default and removes it on request", () => {
    expect(optimizeSvg(ICON, base).output).toContain("<title>Star</title>");
    expect(optimizeSvg(ICON, { ...base, removeTitle: true }).output).not.toContain("<title>");
  });

  it("rounds numbers to the chosen precision", () => {
    expect(optimizeSvg(ICON, base).output).toContain("1.123");
    const r = optimizeSvg(ICON, { ...base, floatPrecision: "1" }).output;
    expect(r).not.toContain("1.12");
    expect(r).toContain("1.1 3 9.4 17.3");
  });

  it("removes width/height but keeps viewBox", () => {
    const r = optimizeSvg(ICON, { ...base, removeDimensions: true }).output;
    expect(r).not.toMatch(/<svg[^>]* width=/);
    expect(r).toContain('viewBox="0 0 24 24"');
  });

  it("can keep IDs, prefix them, and switch colours to currentColor", () => {
    expect(optimizeSvg(ICON, base).output).not.toContain('id="grad"');
    expect(optimizeSvg(ICON, { ...base, keepIds: true }).output).toContain('id="grad"');
    const prefixed = optimizeSvg(ICON, { ...base, keepIds: true, idPrefix: "star" }).output;
    expect(prefixed).toContain('id="star-grad"');
    expect(prefixed).toContain("url(#star-grad)");
    expect(prefixed).toContain('class="star-a"');
    expect(optimizeSvg(ICON, { ...base, currentColor: true }).output).toContain('fill="currentColor"');
  });

  it("pretty-prints and emits data URIs, while byte counts still compare SVG sizes", () => {
    expect(optimizeSvg(ICON, { ...base, pretty: true }).output.split("\n").length).toBeGreaterThan(3);
    const uri = optimizeSvg(ICON, { ...base, outputFormat: "dataUri" });
    expect(uri.output.startsWith("data:image/svg+xml,")).toBe(true);
    expect(uri.outputBytes).toBe(optimizeSvg(ICON, base).outputBytes);
    expect(optimizeSvg(ICON, { ...base, outputFormat: "base64" }).output.startsWith("data:image/svg+xml;base64,")).toBe(true);
  });

  it("treats options missing from older saved pipelines as defaults", () => {
    const legacy = { pluginsPreset: "default", removeViewBox: false, multipass: true } as SvgOptimizerOptions;
    expect(optimizeSvg(ICON, legacy).output).toBe(optimizeSvg(ICON, base).output);
  });
});


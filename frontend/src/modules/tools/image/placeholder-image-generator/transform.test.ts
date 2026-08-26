import { describe, expect, it } from "vitest";
import { generatePlaceholderImage, placeholderImageToDataUri } from "./transform";
import type { PlaceholderImageOptions } from "./schema";

const base: PlaceholderImageOptions = {
  width: 600,
  height: 400,
  backgroundColor: "#94a3b8",
  textColor: "#ffffff",
};

describe("generatePlaceholderImage", () => {
  it("generates an SVG with the given dimensions", () => {
    const result = generatePlaceholderImage(base);
    expect(result.error).toBeNull();
    expect(result.output).toContain('width="600"');
    expect(result.output).toContain('height="400"');
    expect(result.output).toContain('fill="#94a3b8"');
  });

  it("defaults the label to WIDTH×HEIGHT when no text is given", () => {
    const result = generatePlaceholderImage(base);
    expect(result.output).toContain("600×400");
  });

  it("uses custom label text when provided", () => {
    const result = generatePlaceholderImage({ ...base, text: "Hero" });
    expect(result.output).toContain(">Hero<");
  });

  it("escapes unsafe characters in the label", () => {
    const result = generatePlaceholderImage({ ...base, text: '<script>&"' });
    expect(result.output).not.toContain("<script>");
    expect(result.output).toContain("&lt;script&gt;&amp;&quot;");
  });

  it("errors on an invalid background color", () => {
    const result = generatePlaceholderImage({ ...base, backgroundColor: "blue" });
    expect(result.error).not.toBeNull();
  });

  it("errors on a non-integer or out-of-range dimension", () => {
    expect(generatePlaceholderImage({ ...base, width: 0 }).error).not.toBeNull();
    expect(generatePlaceholderImage({ ...base, width: 5000 }).error).not.toBeNull();
  });
});

describe("placeholderImageToDataUri", () => {
  it("wraps SVG markup as a data: URI", () => {
    const svg = generatePlaceholderImage(base).output;
    const uri = placeholderImageToDataUri(svg);
    expect(uri.startsWith("data:image/svg+xml,")).toBe(true);
  });
});

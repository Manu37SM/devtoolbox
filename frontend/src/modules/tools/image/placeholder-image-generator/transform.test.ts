import { describe, expect, it } from "vitest";
import { generatePlaceholderImage, placeholderImageToDataUri } from "./transform";
import type { PlaceholderImageOptions } from "./schema";

const base: Pick<PlaceholderImageOptions, "width" | "height" | "backgroundColor" | "textColor" | "text"> = {
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

describe("placeholder image options", () => {
  const base = { width: 300, height: 150, backgroundColor: "#cccccc", textColor: "#333333" };
  it("keeps the old markup with default options", () => {
    expect(generatePlaceholderImage(base).output).toBe(
      `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150" viewBox="0 0 300 150" role="img" aria-label="300×150">
  <rect width="100%" height="100%" fill="#cccccc"/>
  <text x="50%" y="50%" fill="#333333" font-family="sans-serif" font-size="19" text-anchor="middle" dominant-baseline="middle">300×150</text>
</svg>`,
    );
  });

  it("supports font size, rounded corners and patterns", () => {
    const svg = generatePlaceholderImage({ ...base, fontSize: 40, cornerRadius: 12, pattern: "cross" }).output;
    expect(svg).toContain('font-size="40"');
    expect(svg).toContain('<rect width="100%" height="100%" fill="#cccccc" rx="12"/>');
    expect(svg).toContain('<path d="M0 0L300 150M300 0L0 150"');
    expect(svg).toContain('clip-path="url(#c)"');
    expect(generatePlaceholderImage({ ...base, pattern: "grid" }).output).toContain("M15 0V150");
  });

  it("prints dimensions under custom text", () => {
    const svg = generatePlaceholderImage({ ...base, text: "Hero", showDimensions: true }).output;
    expect(svg).toContain(">Hero</text>");
    expect(svg).toContain(">300×150</text>");
  });
});


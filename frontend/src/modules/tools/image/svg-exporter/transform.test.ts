// `exportSvg`'s rasterization step loads the SVG into a real
// `HTMLImageElement` and draws it through a `<canvas>` 2D context, neither
// of which jsdom (this repo's Vitest environment — vitest.config.ts
// doesn't enable jsdom) implements. A true "paste SVG, get back a PNG"
// round trip can't be exercised here; that's covered by manual/browser
// testing instead.
//
// What IS unit-tested:
//   - `isLikelySvgMarkup` and `resolveCanvasBackground`, the fully pure
//     helper functions extracted specifically so this logic doesn't ride
//     along unexercised inside the DOM-dependent code path.
//   - that `exportSvg` rejects garbage input BEFORE attempting to load it
//     as an image (the whole point of the early sanity check), and that it
//     otherwise fails gracefully rather than throwing when the DOM APIs it
//     needs are unavailable.
import { describe, expect, it } from "vitest";
import { exportSvg, isLikelySvgMarkup, resolveCanvasBackground } from "./transform";

describe("isLikelySvgMarkup", () => {
  it("accepts a plain <svg> root", () => {
    expect(isLikelySvgMarkup('<svg xmlns="http://www.w3.org/2000/svg"></svg>')).toBe(true);
  });

  it("accepts an <?xml?> declaration before the <svg> root", () => {
    expect(isLikelySvgMarkup('<?xml version="1.0" encoding="UTF-8"?>\n<svg></svg>')).toBe(true);
  });

  it("accepts a DOCTYPE before the <svg> root", () => {
    expect(
      isLikelySvgMarkup(
        '<?xml version="1.0"?>\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n<svg></svg>',
      ),
    ).toBe(true);
  });

  it("accepts leading whitespace", () => {
    expect(isLikelySvgMarkup("   \n  <svg></svg>")).toBe(true);
  });

  it("rejects empty input", () => {
    expect(isLikelySvgMarkup("")).toBe(false);
    expect(isLikelySvgMarkup("   ")).toBe(false);
  });

  it("rejects non-SVG markup", () => {
    expect(isLikelySvgMarkup("<div>not svg</div>")).toBe(false);
    expect(isLikelySvgMarkup('{"not": "svg"}')).toBe(false);
    expect(isLikelySvgMarkup("just some text")).toBe(false);
  });

  it("does not false-positive on the substring 'svg' appearing elsewhere", () => {
    expect(isLikelySvgMarkup("this text mentions svg but isn't markup")).toBe(false);
  });
});

describe("resolveCanvasBackground", () => {
  it("leaves PNG transparent when backgroundColor is 'transparent'", () => {
    expect(resolveCanvasBackground("image/png", "transparent")).toBeUndefined();
  });

  it("leaves WebP transparent when backgroundColor is 'transparent'", () => {
    expect(resolveCanvasBackground("image/webp", "transparent")).toBeUndefined();
  });

  it("falls back JPEG's transparent selection to opaque white", () => {
    expect(resolveCanvasBackground("image/jpeg", "transparent")).toBe("#ffffff");
  });

  it("uses an explicit color for any format when one is given", () => {
    expect(resolveCanvasBackground("image/png", "#ff0000")).toBe("#ff0000");
    expect(resolveCanvasBackground("image/jpeg", "#ff0000")).toBe("#ff0000");
    expect(resolveCanvasBackground("image/webp", "#00ff00")).toBe("#00ff00");
  });
});

const baseOptions = {
  outputFormat: "image/png" as const,
  width: 256,
  height: 256,
  quality: 92,
  backgroundColor: "transparent",
};

describe("exportSvg", () => {
  it("rejects garbage input before attempting to load it as an image", async () => {
    const result = await exportSvg("not valid svg at all", baseOptions);
    expect(result.dataUrl).toBe("");
    expect(result.error).toContain("doesn't look like valid SVG");
  });

  it("rejects empty input", async () => {
    const result = await exportSvg("", baseOptions);
    expect(result.error).not.toBeNull();
  });

  it("fails gracefully (not a thrown exception) for well-formed SVG in this DOM-less environment", async () => {
    const result = await exportSvg('<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>', baseOptions);
    expect(result.dataUrl).toBe("");
    expect(result.error).not.toBeNull();
    expect(typeof result.error).toBe("string");
  });
});

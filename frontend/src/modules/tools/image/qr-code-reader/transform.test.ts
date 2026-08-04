import { describe, expect, it } from "vitest";
import jsQR from "jsqr";

// `decodeQrCode` itself (transform.ts) drives `createImageBitmap` and
// `<canvas>`/`getImageData`, none of which exist under jsdom (jsdom doesn't
// implement canvas 2D rendering or ImageBitmap) — so a genuine round-trip
// "decode a real QR image file" test isn't practical to run in this
// environment/CI without a headless-browser runner (Playwright, which this
// repo does have for e2e, but that's out of scope for a Vitest unit test).
// What *is* practical and genuinely meaningful to unit test without a DOM:
// jsQR's own behavior against synthetic ImageData-shaped pixel buffers,
// which is the actual decoding logic `decodeQrCode` delegates to. Random
// noise legitimately contains no scannable QR pattern, so asserting jsQR
// returns `null` for it is a real "not found" case, not a mocked one.
describe("jsQR (feeds decodeQrCode's core decoding step)", () => {
  it("returns null for random noise with no QR pattern", () => {
    const width = 200;
    const height = 200;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      const v = Math.floor(Math.random() * 256);
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }
    const result = jsQR(data, width, height, { inversionAttempts: "attemptBoth" });
    expect(result).toBeNull();
  });

  it("returns null for a solid-color (all-white) image", () => {
    const width = 100;
    const height = 100;
    const data = new Uint8ClampedArray(width * height * 4).fill(255);
    const result = jsQR(data, width, height);
    expect(result).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import jsQR from "jsqr";

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



import { describe, expect, it } from "vitest";
import { convertImageFormat } from "./transform";
import { isQualityRelevant } from "./schema";

function fakeImageFile(name = "photo.png", size = 8000): File {
  return new File([new Uint8Array(size)], name, { type: "image/png" });
}

describe("convertImageFormat", () => {
  it("never throws and returns a graceful error result in this DOM-less environment", async () => {
    const file = fakeImageFile();
    const result = await convertImageFormat(file, { targetFormat: "image/webp", quality: 92 });

    expect(result.dataUrl).toBe("");
    expect(result.error).not.toBeNull();
    expect(typeof result.error).toBe("string");
  });

  it("behaves the same regardless of target format when decoding fails", async () => {
    const file = fakeImageFile();
    const pngResult = await convertImageFormat(file, { targetFormat: "image/png", quality: 92 });
    const jpegResult = await convertImageFormat(file, { targetFormat: "image/jpeg", quality: 92 });

    expect(pngResult.error).not.toBeNull();
    expect(jpegResult.error).not.toBeNull();
  });
});

describe("isQualityRelevant", () => {
  it("is false for PNG (lossless)", () => {
    expect(isQualityRelevant("image/png")).toBe(false);
  });

  it("is true for JPEG and WebP (lossy, quality-tunable)", () => {
    expect(isQualityRelevant("image/jpeg")).toBe(true);
    expect(isQualityRelevant("image/webp")).toBe(true);
  });
});

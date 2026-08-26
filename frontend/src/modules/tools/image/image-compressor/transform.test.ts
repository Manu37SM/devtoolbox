

import { describe, expect, it } from "vitest";
import { compressImage } from "./transform";

function fakeImageFile(name = "photo.jpg", size = 12345): File {
  return new File([new Uint8Array(size)], name, { type: "image/jpeg" });
}

describe("compressImage", () => {
  it("never throws, and reports the original file size even on failure", async () => {
    const file = fakeImageFile("photo.jpg", 20_000);
    const result = await compressImage(file, { format: "image/jpeg", quality: 80 });

    expect(result.originalSize).toBe(20_000);

    expect(result.error).not.toBeNull();
    expect(result.dataUrl).toBe("");
    expect(result.compressedSize).toBe(0);
  });

  it("surfaces a human-readable error message rather than a raw exception object", async () => {
    const file = fakeImageFile();
    const result = await compressImage(file, { format: "image/webp", quality: 50 });

    expect(typeof result.error).toBe("string");
    expect(result.error!.length).toBeGreaterThan(0);
  });
});

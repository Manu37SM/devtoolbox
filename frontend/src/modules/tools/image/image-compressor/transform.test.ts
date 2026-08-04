// `compressImage` draws through a real `<canvas>` 2D context and decodes
// images via `createImageBitmap`/`HTMLImageElement` — none of which jsdom
// (this repo's Vitest environment; see vitest.config.ts, which doesn't
// even enable jsdom) implements. A true "upload a JPEG, get back a smaller
// JPEG" round trip therefore can't be exercised here; that behavior is
// covered by manual/browser testing instead.
//
// What IS unit-tested:
//   - the pure helpers this transform depends on, in
//     `src/lib/image-canvas.test.ts` (clampQuality, dataUrlByteLength, ...)
//   - that `compressImage` fails gracefully (returns an error result, never
//     throws) when the DOM APIs it needs aren't available — which is
//     exactly what happens under Vitest, so it doubles as a real
//     error-path test.
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
    // In this DOM-less environment, image decoding is expected to fail —
    // asserting that failure is graceful (an error string, not a thrown
    // exception/unhandled rejection) is the meaningful thing to verify here.
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

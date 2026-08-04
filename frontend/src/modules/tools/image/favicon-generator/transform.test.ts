import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { bundleFaviconsAsZip } from "./transform";

// `generateFavicons` drives `createImageBitmap`/`<canvas>`, neither of which
// jsdom implements — a real round-trip (upload an image, rasterize it at
// six sizes) isn't practical to unit test here, same reasoning as
// qr-code-reader's transform.test.ts. `bundleFaviconsAsZip`, however, only
// deals with already-produced `Blob`s and jszip's zip-building logic, both
// of which work fine under Node/jsdom — so it's fully tested below with
// synthetic fake blobs standing in for PNG bytes.
describe("bundleFaviconsAsZip", () => {
  it("bundles each image into a correspondingly-named zip entry", async () => {
    const fakeBlob = (content: string) => new Blob([content], { type: "image/png" });
    const images = [
      { size: 16, blob: fakeBlob("16px-fake-png-bytes") },
      { size: 32, blob: fakeBlob("32px-fake-png-bytes") },
      { size: 512, blob: fakeBlob("512px-fake-png-bytes") },
    ];

    const zipBlob = await bundleFaviconsAsZip(images);
    expect(zipBlob.size).toBeGreaterThan(0);

    // Read back via ArrayBuffer rather than handing jszip the Blob
    // directly — same reasoning as `bundleFaviconsAsZip` itself: jszip's
    // Blob input/output support depends on browser-only feature detection
    // that doesn't hold under this repo's Node-based Vitest environment.
    const loaded = await JSZip.loadAsync(await zipBlob.arrayBuffer());
    const names = Object.keys(loaded.files).sort();
    expect(names).toEqual(["favicon-16x16.png", "favicon-32x32.png", "favicon-512x512.png"].sort());

    const content16 = await loaded.file("favicon-16x16.png")?.async("string");
    expect(content16).toBe("16px-fake-png-bytes");
  });

  it("produces an empty-but-valid zip for an empty image list", async () => {
    const zipBlob = await bundleFaviconsAsZip([]);
    const loaded = await JSZip.loadAsync(await zipBlob.arrayBuffer());
    expect(Object.keys(loaded.files)).toHaveLength(0);
  });
});

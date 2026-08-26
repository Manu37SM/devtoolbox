import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { bundleFaviconsAsZip } from "./transform";

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

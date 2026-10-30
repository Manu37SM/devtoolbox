import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { buildIco, bundleFaviconsAsZip, iconLayout } from "./transform";
import { writeFileSync } from "node:fs";

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

// A real 1x1 PNG, so the .ico can be opened by an independent decoder.
const PNG_1PX = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGBgAAAABQABpfZFQAAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));

describe("favicon options", () => {
  it("lays out with padding and contain/cover", () => {
    expect(iconLayout(200, 100, 32)).toEqual({ dx: 0, dy: 8, dw: 32, dh: 16 });
    expect(iconLayout(200, 100, 32, 25)).toEqual({ dx: 8, dy: 12, dw: 16, dh: 8 });
    expect(iconLayout(200, 100, 32, 0, "cover")).toEqual({ dx: -16, dy: 0, dw: 64, dh: 32 });
  });

  it("builds a valid ICO directory", () => {
    const ico = buildIco([{ size: 16, png: PNG_1PX }, { size: 256, png: PNG_1PX }]);
    const v = new DataView(ico.buffer);
    expect([v.getUint16(0, true), v.getUint16(2, true), v.getUint16(4, true)]).toEqual([0, 1, 2]);
    expect(ico[6]).toBe(16);
    expect(ico[22]).toBe(0); // 256 is stored as 0
    expect(v.getUint32(6 + 12, true)).toBe(38);
    expect(v.getUint32(22 + 12, true)).toBe(38 + PNG_1PX.length);
    if (process.env.ICO_OUT) writeFileSync(process.env.ICO_OUT, ico);
  });

  it("adds ico, touch icons, manifest and snippet in the full bundle", async () => {
    const images = [16, 32, 48, 180, 192, 512].map((size) => ({ size, blob: new Blob([PNG_1PX], { type: "image/png" }) }));
    const zip = await JSZip.loadAsync(await (await bundleFaviconsAsZip(images, { full: true, appName: "Orders", themeColor: "#123456" })).arrayBuffer());
    expect(Object.keys(zip.files)).toEqual(
      expect.arrayContaining(["favicon.ico", "apple-touch-icon.png", "android-chrome-192x192.png", "android-chrome-512x512.png", "site.webmanifest", "head-snippet.html"]),
    );
    expect(JSON.parse(await zip.file("site.webmanifest")!.async("string"))).toMatchObject({ name: "Orders", theme_color: "#123456" });
  });
});


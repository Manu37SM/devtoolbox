

import { describe, expect, it } from "vitest";
import {
  clampQuality,
  computeSizeReductionPercent,
  dataUrlByteLength,
  findQualityForTarget,
  fitWithin,
  formatBytes,
  mimeToExtension,
} from "./image-canvas";

describe("clampQuality", () => {
  it("passes through values already in range", () => {
    expect(clampQuality(80)).toBe(80);
  });

  it("clamps values above 100", () => {
    expect(clampQuality(150)).toBe(100);
  });

  it("clamps values below 1", () => {
    expect(clampQuality(0)).toBe(1);
    expect(clampQuality(-5)).toBe(1);
  });

  it("rounds fractional values", () => {
    expect(clampQuality(80.6)).toBe(81);
  });

  it("falls back to the default for non-finite input", () => {
    expect(clampQuality(NaN)).toBe(80);
    expect(clampQuality(Infinity, 92)).toBe(92);
  });
});

describe("formatBytes", () => {
  it("formats sub-1KB sizes in bytes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(0)).toBe("0 B");
  });

  it("formats KB sizes", () => {
    expect(formatBytes(340 * 1024)).toBe("340 KB");
  });

  it("formats MB sizes with one decimal under 10", () => {
    expect(formatBytes(1.2 * 1024 * 1024)).toBe("1.2 MB");
  });

  it("formats larger MB sizes without a decimal", () => {
    expect(formatBytes(12 * 1024 * 1024)).toBe("12 MB");
  });

  it("formats GB sizes", () => {
    expect(formatBytes(2.5 * 1024 * 1024 * 1024)).toBe("2.5 GB");
  });

  it("returns 0 B for invalid input", () => {
    expect(formatBytes(-10)).toBe("0 B");
    expect(formatBytes(NaN)).toBe("0 B");
  });
});

describe("computeSizeReductionPercent", () => {
  it("computes a typical compression reduction", () => {
    expect(computeSizeReductionPercent(1_200_000, 340_000)).toBe(72);
  });

  it("returns 0 when the output is the same size", () => {
    expect(computeSizeReductionPercent(1000, 1000)).toBe(0);
  });

  it("clamps to 0 rather than going negative when output is larger", () => {
    expect(computeSizeReductionPercent(1000, 1500)).toBe(0);
  });

  it("returns 0 for a zero or invalid original size", () => {
    expect(computeSizeReductionPercent(0, 100)).toBe(0);
    expect(computeSizeReductionPercent(-5, 100)).toBe(0);
    expect(computeSizeReductionPercent(NaN, 100)).toBe(0);
  });
});

describe("mimeToExtension", () => {
  it("maps known canvas MIME types to extensions", () => {
    expect(mimeToExtension("image/png")).toBe("png");
    expect(mimeToExtension("image/jpeg")).toBe("jpg");
    expect(mimeToExtension("image/webp")).toBe("webp");
  });
});

describe("dataUrlByteLength", () => {
  it("computes byte length for an unpadded base64 payload", () => {

    const dataUrl = "data:text/plain;base64,aGVsbG8=";
    expect(dataUrlByteLength(dataUrl)).toBe(5);
  });

  it("computes byte length for a base64 payload with no padding", () => {

    const dataUrl = "data:text/plain;base64,YWJj";
    expect(dataUrlByteLength(dataUrl)).toBe(3);
  });

  it("returns 0 for a malformed data URL with no comma", () => {
    expect(dataUrlByteLength("not-a-data-url")).toBe(0);
  });

  it("returns 0 for an empty payload", () => {
    expect(dataUrlByteLength("data:image/png;base64,")).toBe(0);
  });
});

describe("fitWithin", () => {
  it("scales the longer side down and never upscales", () => {
    expect(fitWithin(4000, 3000, 1920)).toEqual({ width: 1920, height: 1440 });
    expect(fitWithin(1000, 3000, 1000)).toEqual({ width: 333, height: 1000 });
    expect(fitWithin(800, 600, 1920)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(800, 600, 0)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(5000, 1, 100)).toEqual({ width: 100, height: 1 });
  });
});

describe("findQualityForTarget", () => {
  it("finds the highest quality under the target", async () => {
    const calls: number[] = [];
    const r = await findQualityForTarget(async (q) => {
      calls.push(q);
      return q * 1000;
    }, 42_500);
    expect(r).toEqual({ quality: 42, bytes: 42_000, met: true });
    expect(calls.length).toBeLessThanOrEqual(8);
  });

  it("reports when even quality 1 is too big", async () => {
    expect(await findQualityForTarget(async (q) => 10_000 + q, 500)).toEqual({ quality: 1, bytes: 10_001, met: false });
  });
});


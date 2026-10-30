import { describe, expect, it } from "vitest";
import { applyColorBlindnessToImageData, machadoMatrix, simulateColorBlindness } from "./transform";

describe("simulateColorBlindness", () => {
  it("leaves pure black and pure white effectively unchanged", () => {
    expect(simulateColorBlindness({ r: 0, g: 0, b: 0 }, "deuteranopia")).toEqual({ r: 0, g: 0, b: 0 });
    expect(simulateColorBlindness({ r: 255, g: 255, b: 255 }, "deuteranopia")).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("collapses a color to grayscale under achromatopsia", () => {
    const result = simulateColorBlindness({ r: 200, g: 50, b: 10 }, "achromatopsia");
    expect(result.r).toBe(result.g);
    expect(result.g).toBe(result.b);
  });

  it("shifts a pure red under protanopia (red-weak)", () => {
    const result = simulateColorBlindness({ r: 255, g: 0, b: 0 }, "protanopia");

    expect(result.r).toBeLessThan(255);
    expect(result.g).toBeGreaterThan(0);
  });

  it("clamps output to the 0-255 range", () => {
    const result = simulateColorBlindness({ r: 255, g: 255, b: 255 }, "tritanopia");
    for (const channel of [result.r, result.g, result.b]) {
      expect(channel).toBeGreaterThanOrEqual(0);
      expect(channel).toBeLessThanOrEqual(255);
    }
  });
});

describe("applyColorBlindnessToImageData", () => {
  it("transforms every pixel and leaves alpha untouched", () => {
    const data = new Uint8ClampedArray([255, 0, 0, 128, 0, 255, 0, 200]);
    const imageData = { data, width: 2, height: 1 } as unknown as ImageData;
    applyColorBlindnessToImageData(imageData, "achromatopsia");

    expect(data[3]).toBe(128);
    expect(data[0]).toBe(data[1]);
    expect(data[1]).toBe(data[2]);

    expect(data[7]).toBe(200);
  });
});

describe("Machado model and severity", () => {
  it("uses the published matrices (checked against colorspacious) and interpolates between steps", () => {
    expect(machadoMatrix("deuteranopia", 100).map((v) => +v.toFixed(6))).toEqual([0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182, 0.04294, 0.968881]);
    expect(machadoMatrix("protanopia", 0)).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    const mid = machadoMatrix("tritanopia", 55);
    const lo = machadoMatrix("tritanopia", 50);
    const hi = machadoMatrix("tritanopia", 60);
    mid.forEach((v, i) => expect(v).toBeCloseTo((lo[i]! + hi[i]!) / 2, 9));
  });

  it("matches colorspacious for a sample colour (sRGB -> linear -> matrix -> sRGB)", () => {
    // colorspacious: cspace_convert([1,0,0], {"name":"sRGB1+CVD","cvd_type":"deuteranomaly","severity":100}, "sRGB1") * 255 -> (163, 144, 0)
    expect(simulateColorBlindness({ r: 255, g: 0, b: 0 }, "deuteranopia")).toEqual({ r: 163, g: 144, b: 0 });
  });

  it("severity 0 leaves colours unchanged and lower severity changes them less", () => {
    const c = { r: 200, g: 60, b: 30 };
    expect(simulateColorBlindness(c, "protanopia", { severity: 0 })).toEqual(c);
    const dist = (a: typeof c) => Math.abs(a.r - c.r) + Math.abs(a.g - c.g) + Math.abs(a.b - c.b);
    expect(dist(simulateColorBlindness(c, "protanopia", { severity: 40 }))).toBeLessThan(dist(simulateColorBlindness(c, "protanopia", { severity: 100 })));
    expect(simulateColorBlindness(c, "protanopia", { model: "simple", severity: 0 })).toEqual(c);
  });
});


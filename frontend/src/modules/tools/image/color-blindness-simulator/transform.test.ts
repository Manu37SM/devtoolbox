import { describe, expect, it } from "vitest";
import { applyColorBlindnessToImageData, simulateColorBlindness } from "./transform";

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

import { describe, expect, it } from "vitest";
import { generateGradientCss } from "./transform";
import type { CssGradientGeneratorOptions } from "./schema";

const twoStops = [
  { color: "#6366f1", position: 0 },
  { color: "#ec4899", position: 100 },
];

describe("generateGradientCss — linear", () => {
  it("generates a linear-gradient with the given angle and stops", () => {
    const options: CssGradientGeneratorOptions = { type: "linear", angle: 90, stops: twoStops };
    const result = generateGradientCss(options);
    expect(result.error).toBeNull();
    expect(result.output).toBe("background: linear-gradient(90deg, #6366f1 0%, #ec4899 100%);");
  });

  it("defaults angle correctly at 0deg", () => {
    const result = generateGradientCss({ type: "linear", angle: 0, stops: twoStops });
    expect(result.output).toContain("linear-gradient(0deg,");
  });
});

describe("generateGradientCss — radial", () => {
  it("generates a radial-gradient, ignoring angle", () => {
    const result = generateGradientCss({ type: "radial", angle: 45, stops: twoStops });
    expect(result.error).toBeNull();
    expect(result.output).toBe("background: radial-gradient(circle, #6366f1 0%, #ec4899 100%);");
  });
});

describe("generateGradientCss — conic", () => {
  it("generates a conic-gradient using the angle as the starting point", () => {
    const result = generateGradientCss({ type: "conic", angle: 180, stops: twoStops });
    expect(result.error).toBeNull();
    expect(result.output).toBe("background: conic-gradient(from 180deg, #6366f1 0%, #ec4899 100%);");
  });
});

describe("generateGradientCss — multiple stops", () => {
  it("supports 3+ stops in the given order", () => {
    const stops = [
      { color: "#ff0000", position: 0 },
      { color: "#00ff00", position: 50 },
      { color: "#0000ff", position: 100 },
    ];
    const result = generateGradientCss({ type: "linear", angle: 90, stops });
    expect(result.output).toBe(
      "background: linear-gradient(90deg, #ff0000 0%, #00ff00 50%, #0000ff 100%);",
    );
  });

  it("sorts stops by position regardless of input order", () => {
    const stops = [
      { color: "#0000ff", position: 100 },
      { color: "#ff0000", position: 0 },
      { color: "#00ff00", position: 50 },
    ];
    const result = generateGradientCss({ type: "linear", angle: 90, stops });
    expect(result.output).toBe(
      "background: linear-gradient(90deg, #ff0000 0%, #00ff00 50%, #0000ff 100%);",
    );
  });
});

describe("generateGradientCss — validation", () => {
  it("errors with fewer than 2 stops", () => {
    const result = generateGradientCss({ type: "linear", angle: 90, stops: [{ color: "#fff", position: 0 }] });
    expect(result.error).not.toBeNull();
    expect(result.output).toBe("");
  });

  it("errors when a stop position is out of range", () => {
    const stops = [
      { color: "#fff", position: -10 },
      { color: "#000", position: 100 },
    ];
    const result = generateGradientCss({ type: "linear", angle: 90, stops });
    expect(result.error).not.toBeNull();
  });

  it("errors when a stop position exceeds 100", () => {
    const stops = [
      { color: "#fff", position: 0 },
      { color: "#000", position: 150 },
    ];
    const result = generateGradientCss({ type: "linear", angle: 90, stops });
    expect(result.error).not.toBeNull();
  });
});

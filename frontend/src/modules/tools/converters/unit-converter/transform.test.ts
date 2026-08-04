import { describe, expect, it } from "vitest";
import { convertUnit, getUnitsForCategory } from "./transform";
import type { UnitConverterOptions } from "./schema";

const dataOpts: UnitConverterOptions = { category: "data", fromUnit: "MB", toUnit: "GB", dataBase: "1024" };

describe("convertUnit — data", () => {
  it("converts MB to GB using base 1024", () => {
    const result = convertUnit(1024, dataOpts);
    expect(result.error).toBeNull();
    expect(result.result).toBeCloseTo(1, 10);
  });

  it("converts using base 1000 when requested", () => {
    const result = convertUnit(1000, { ...dataOpts, dataBase: "1000" });
    expect(result.result).toBeCloseTo(1, 10);
  });

  it("gives different results for the same input under base 1000 vs 1024", () => {
    const r1024 = convertUnit(1, { category: "data", fromUnit: "GB", toUnit: "MB", dataBase: "1024" });
    const r1000 = convertUnit(1, { category: "data", fromUnit: "GB", toUnit: "MB", dataBase: "1000" });
    expect(r1024.result).toBe(1024);
    expect(r1000.result).toBe(1000);
  });

  it("includes a reference row for every unit in the category", () => {
    const result = convertUnit(1, dataOpts);
    expect(result.allUnits.map((u) => u.unit)).toEqual(["B", "KB", "MB", "GB", "TB"]);
  });
});

describe("convertUnit — time", () => {
  it("converts hours to minutes", () => {
    const result = convertUnit(2, { category: "time", fromUnit: "hr", toUnit: "min", dataBase: "1024" });
    expect(result.result).toBe(120);
  });

  it("converts days to seconds", () => {
    const result = convertUnit(1, { category: "time", fromUnit: "day", toUnit: "s", dataBase: "1024" });
    expect(result.result).toBe(86_400);
  });
});

describe("convertUnit — length", () => {
  it("converts kilometers to miles", () => {
    const result = convertUnit(1, { category: "length", fromUnit: "km", toUnit: "mi", dataBase: "1024" });
    expect(result.result).toBeCloseTo(0.621371, 5);
  });

  it("converts inches to centimeters", () => {
    const result = convertUnit(1, { category: "length", fromUnit: "in", toUnit: "cm", dataBase: "1024" });
    expect(result.result).toBeCloseTo(2.54, 5);
  });
});

describe("convertUnit — weight", () => {
  it("converts kilograms to pounds", () => {
    const result = convertUnit(1, { category: "weight", fromUnit: "kg", toUnit: "lb", dataBase: "1024" });
    expect(result.result).toBeCloseTo(2.20462, 4);
  });
});

describe("convertUnit — edge cases", () => {
  it("errors on a non-finite value", () => {
    const result = convertUnit(NaN, dataOpts);
    expect(result.error).not.toBeNull();
    expect(result.result).toBeNull();
  });

  it("errors on an unknown unit", () => {
    const result = convertUnit(1, { category: "data", fromUnit: "XB", toUnit: "GB", dataBase: "1024" });
    expect(result.error).not.toBeNull();
  });

  it("returns 0 for a 0 input without erroring", () => {
    const result = convertUnit(0, dataOpts);
    expect(result.error).toBeNull();
    expect(result.result).toBe(0);
  });
});

describe("getUnitsForCategory", () => {
  it("returns the expected unit ids for each category", () => {
    expect(getUnitsForCategory("time", "1024").map((u) => u.id)).toEqual(["ms", "s", "min", "hr", "day", "week"]);
    expect(getUnitsForCategory("length", "1024").map((u) => u.id)).toEqual(["mm", "cm", "m", "km", "in", "ft", "yd", "mi"]);
    expect(getUnitsForCategory("weight", "1024").map((u) => u.id)).toEqual(["mg", "g", "kg", "oz", "lb"]);
  });
});

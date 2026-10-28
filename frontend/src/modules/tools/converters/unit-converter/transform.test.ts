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

const o = (category: UnitConverterOptions["category"], fromUnit: string, toUnit: string): UnitConverterOptions => ({ category, fromUnit, toUnit, dataBase: "1024" });

describe("convertUnit — temperature (non-proportional)", () => {
  it("converts the classic fixed points exactly", () => {
    expect(convertUnit(100, o("temperature", "C", "F")).result).toBe(212);
    expect(convertUnit(0, o("temperature", "C", "F")).result).toBe(32);
    expect(convertUnit(-40, o("temperature", "C", "F")).result).toBe(-40);
    expect(convertUnit(98.6, o("temperature", "F", "C")).result).toBeCloseTo(37, 10);
  });
  it("handles Kelvin and Rankine, including absolute zero", () => {
    expect(convertUnit(0, o("temperature", "K", "C")).result).toBe(-273.15);
    expect(convertUnit(-273.15, o("temperature", "C", "K")).result).toBe(0);
    expect(convertUnit(0, o("temperature", "R", "K")).result).toBeCloseTo(0, 10);
    expect(convertUnit(491.67, o("temperature", "R", "C")).result).toBeCloseTo(0, 10);
  });
  it("populates every unit row from the same base value", () => {
    const rows = convertUnit(100, o("temperature", "C", "F")).allUnits;
    expect(rows.map((r) => r.unit)).toEqual(["C", "F", "K", "R"]);
    expect(rows.find((r) => r.unit === "K")!.value).toBe(373.15);
  });
  it("round-trips within floating point tolerance", () => {
    const f = convertUnit(36.6, o("temperature", "C", "F")).result!;
    expect(convertUnit(f, o("temperature", "F", "C")).result).toBeCloseTo(36.6, 9);
  });
});

describe("convertUnit — speed, area, volume, pressure, energy", () => {
  it("speed", () => {
    expect(convertUnit(60, o("speed", "mph", "km/h")).result).toBeCloseTo(96.56064, 5);
    expect(convertUnit(100, o("speed", "km/h", "m/s")).result).toBeCloseTo(27.7778, 4);
    expect(convertUnit(1, o("speed", "kn", "km/h")).result).toBeCloseTo(1.852, 10);
  });
  it("area", () => {
    expect(convertUnit(1, o("area", "ac", "m2")).result).toBeCloseTo(4046.8564224, 7);
    expect(convertUnit(1, o("area", "ha", "ac")).result).toBeCloseTo(2.4710538, 6);
    expect(convertUnit(1, o("area", "km2", "ha")).result).toBe(100);
    expect(convertUnit(1, o("area", "ft2", "in2")).result).toBeCloseTo(144, 8);
  });
  it("volume (US customary)", () => {
    expect(convertUnit(1, o("volume", "gal", "L")).result).toBeCloseTo(3.785411784, 9);
    expect(convertUnit(1, o("volume", "gal", "qt")).result).toBeCloseTo(4, 9);
    expect(convertUnit(1, o("volume", "cup", "tbsp")).result).toBeCloseTo(16, 8);
    expect(convertUnit(1, o("volume", "m3", "L")).result).toBe(1000);
  });
  it("pressure", () => {
    expect(convertUnit(1, o("pressure", "atm", "kPa")).result).toBe(101.325);
    expect(convertUnit(1, o("pressure", "bar", "psi")).result).toBeCloseTo(14.5037738, 6);
    expect(convertUnit(760, o("pressure", "mmHg", "atm")).result).toBeCloseTo(1, 5);
    expect(convertUnit(760, o("pressure", "torr", "atm")).result).toBeCloseTo(1, 12);
  });
  it("energy", () => {
    expect(convertUnit(1, o("energy", "kWh", "kJ")).result).toBe(3600);
    expect(convertUnit(1, o("energy", "kcal", "J")).result).toBe(4184);
    expect(convertUnit(1, o("energy", "BTU", "J")).result).toBeCloseTo(1055.05585262, 8);
  });
  it("every new category has unique unit ids and a positive factor", () => {
    for (const c of ["temperature", "speed", "area", "volume", "pressure", "energy"] as const) {
      const units = getUnitsForCategory(c, "1024");
      expect(new Set(units.map((u) => u.id)).size).toBe(units.length);
      expect(units.every((u) => u.toBase > 0)).toBe(true);
    }
  });
  it("rejects units from another category", () => {
    expect(convertUnit(1, o("speed", "kg", "mph")).error).not.toBeNull();
  });
});

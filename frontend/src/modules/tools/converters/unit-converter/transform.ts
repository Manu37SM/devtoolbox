import type { UnitConverterOptions } from "./schema";

/** This tool's natural shape is "compute a value plus a reference table",
 * not a single input→output string, so `convertUnit` returns
 * `{ result, allUnits, error }` — see DEVELOPMENT_GUIDE.md's allowance for
 * a different return shape when the string contract doesn't fit. Pure,
 * hand-rolled unit conversion tables (multiplier to each category's base
 * unit); no external unit-conversion library is used. */

export interface UnitDefinition {
  id: string;
  label: string;
  /** Multiplier to convert 1 of this unit into the category's base unit. */
  toBase: number;
}

const TIME_UNITS: UnitDefinition[] = [
  { id: "ms", label: "Milliseconds", toBase: 1 },
  { id: "s", label: "Seconds", toBase: 1000 },
  { id: "min", label: "Minutes", toBase: 60_000 },
  { id: "hr", label: "Hours", toBase: 3_600_000 },
  { id: "day", label: "Days", toBase: 86_400_000 },
  { id: "week", label: "Weeks", toBase: 604_800_000 },
];

const LENGTH_UNITS: UnitDefinition[] = [
  { id: "mm", label: "Millimeters", toBase: 0.001 },
  { id: "cm", label: "Centimeters", toBase: 0.01 },
  { id: "m", label: "Meters", toBase: 1 },
  { id: "km", label: "Kilometers", toBase: 1000 },
  { id: "in", label: "Inches", toBase: 0.0254 },
  { id: "ft", label: "Feet", toBase: 0.3048 },
  { id: "yd", label: "Yards", toBase: 0.9144 },
  { id: "mi", label: "Miles", toBase: 1609.344 },
];

const WEIGHT_UNITS: UnitDefinition[] = [
  { id: "mg", label: "Milligrams", toBase: 0.001 },
  { id: "g", label: "Grams", toBase: 1 },
  { id: "kg", label: "Kilograms", toBase: 1000 },
  { id: "oz", label: "Ounces", toBase: 28.349523125 },
  { id: "lb", label: "Pounds", toBase: 453.59237 },
];

function dataUnits(base: 1000 | 1024): UnitDefinition[] {
  return [
    { id: "B", label: "Bytes", toBase: 1 },
    { id: "KB", label: base === 1024 ? "KB (1024 B)" : "KB (1000 B)", toBase: base },
    { id: "MB", label: base === 1024 ? "MB (1024 KB)" : "MB (1000 KB)", toBase: base ** 2 },
    { id: "GB", label: base === 1024 ? "GB (1024 MB)" : "GB (1000 MB)", toBase: base ** 3 },
    { id: "TB", label: base === 1024 ? "TB (1024 GB)" : "TB (1000 GB)", toBase: base ** 4 },
  ];
}

export function getUnitsForCategory(
  category: UnitConverterOptions["category"],
  dataBase: UnitConverterOptions["dataBase"],
): UnitDefinition[] {
  switch (category) {
    case "data":
      return dataUnits(Number(dataBase) as 1000 | 1024);
    case "time":
      return TIME_UNITS;
    case "length":
      return LENGTH_UNITS;
    case "weight":
      return WEIGHT_UNITS;
  }
}

export interface UnitTableRow {
  unit: string;
  label: string;
  value: number;
}

export interface UnitConversionResult {
  result: number | null;
  allUnits: UnitTableRow[];
  error: { message: string } | null;
}

export function convertUnit(value: number, options: UnitConverterOptions): UnitConversionResult {
  if (!Number.isFinite(value)) {
    return { result: null, allUnits: [], error: { message: "Enter a valid number." } };
  }

  const units = getUnitsForCategory(options.category, options.dataBase);
  const fromDef = units.find((u) => u.id === options.fromUnit);
  const toDef = units.find((u) => u.id === options.toUnit);

  if (!fromDef || !toDef) {
    return {
      result: null,
      allUnits: [],
      error: { message: `Unknown unit "${!fromDef ? options.fromUnit : options.toUnit}" for category "${options.category}".` },
    };
  }

  const baseValue = value * fromDef.toBase;
  const result = baseValue / toDef.toBase;
  const allUnits = units.map((u) => ({ unit: u.id, label: u.label, value: baseValue / u.toBase }));

  return { result, allUnits, error: null };
}

import type { UnitConverterOptions } from "./schema";

export interface UnitDefinition {
  id: string;
  label: string;
  /** Multiplier to the category's base unit. Ignored when `toBaseFn` / `fromBaseFn` are given. */
  toBase: number;
  /** For non-proportional units (temperature): convert a value in this unit to the base unit and back. */
  toBaseFn?: (value: number) => number;
  fromBaseFn?: (base: number) => number;
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

// Temperature base unit: degrees Celsius.
const TEMPERATURE_UNITS: UnitDefinition[] = [
  { id: "C", label: "Celsius", toBase: 1, toBaseFn: (v) => v, fromBaseFn: (b) => b },
  { id: "F", label: "Fahrenheit", toBase: 1, toBaseFn: (v) => ((v - 32) * 5) / 9, fromBaseFn: (b) => (b * 9) / 5 + 32 },
  { id: "K", label: "Kelvin", toBase: 1, toBaseFn: (v) => v - 273.15, fromBaseFn: (b) => b + 273.15 },
  { id: "R", label: "Rankine", toBase: 1, toBaseFn: (v) => ((v - 491.67) * 5) / 9, fromBaseFn: (b) => (b * 9) / 5 + 491.67 },
];

// Speed base unit: metres per second.
const SPEED_UNITS: UnitDefinition[] = [
  { id: "m/s", label: "Metres per second", toBase: 1 },
  { id: "km/h", label: "Kilometres per hour", toBase: 1 / 3.6 },
  { id: "mph", label: "Miles per hour", toBase: 0.44704 },
  { id: "kn", label: "Knots", toBase: 1852 / 3600 },
  { id: "ft/s", label: "Feet per second", toBase: 0.3048 },
];

// Area base unit: square metres.
const AREA_UNITS: UnitDefinition[] = [
  { id: "mm2", label: "Square millimetres", toBase: 1e-6 },
  { id: "cm2", label: "Square centimetres", toBase: 1e-4 },
  { id: "m2", label: "Square metres", toBase: 1 },
  { id: "ha", label: "Hectares", toBase: 10_000 },
  { id: "km2", label: "Square kilometres", toBase: 1e6 },
  { id: "in2", label: "Square inches", toBase: 0.00064516 },
  { id: "ft2", label: "Square feet", toBase: 0.09290304 },
  { id: "yd2", label: "Square yards", toBase: 0.83612736 },
  { id: "ac", label: "Acres", toBase: 4046.8564224 },
  { id: "mi2", label: "Square miles", toBase: 2_589_988.110336 },
];

// Volume base unit: litres (US customary units).
const VOLUME_UNITS: UnitDefinition[] = [
  { id: "mL", label: "Millilitres", toBase: 0.001 },
  { id: "L", label: "Litres", toBase: 1 },
  { id: "m3", label: "Cubic metres", toBase: 1000 },
  { id: "tsp", label: "Teaspoons (US)", toBase: 0.00492892159375 },
  { id: "tbsp", label: "Tablespoons (US)", toBase: 0.01478676478125 },
  { id: "floz", label: "Fluid ounces (US)", toBase: 0.0295735295625 },
  { id: "cup", label: "Cups (US)", toBase: 0.2365882365 },
  { id: "pt", label: "Pints (US)", toBase: 0.473176473 },
  { id: "qt", label: "Quarts (US)", toBase: 0.946352946 },
  { id: "gal", label: "Gallons (US)", toBase: 3.785411784 },
];

// Pressure base unit: pascals.
const PRESSURE_UNITS: UnitDefinition[] = [
  { id: "Pa", label: "Pascals", toBase: 1 },
  { id: "kPa", label: "Kilopascals", toBase: 1000 },
  { id: "MPa", label: "Megapascals", toBase: 1e6 },
  { id: "bar", label: "Bar", toBase: 100_000 },
  { id: "atm", label: "Standard atmospheres", toBase: 101_325 },
  { id: "psi", label: "Pounds per square inch", toBase: 6894.757293168 },
  { id: "mmHg", label: "Millimetres of mercury", toBase: 133.322387415 },
  { id: "torr", label: "Torr", toBase: 101_325 / 760 },
];

// Energy base unit: joules.
const ENERGY_UNITS: UnitDefinition[] = [
  { id: "J", label: "Joules", toBase: 1 },
  { id: "kJ", label: "Kilojoules", toBase: 1000 },
  { id: "cal", label: "Calories (thermochemical)", toBase: 4.184 },
  { id: "kcal", label: "Kilocalories (food Calories)", toBase: 4184 },
  { id: "Wh", label: "Watt-hours", toBase: 3600 },
  { id: "kWh", label: "Kilowatt-hours", toBase: 3_600_000 },
  { id: "BTU", label: "British thermal units (IT)", toBase: 1055.05585262 },
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
    case "temperature":
      return TEMPERATURE_UNITS;
    case "speed":
      return SPEED_UNITS;
    case "area":
      return AREA_UNITS;
    case "volume":
      return VOLUME_UNITS;
    case "pressure":
      return PRESSURE_UNITS;
    case "energy":
      return ENERGY_UNITS;
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

/** Trim binary floating-point noise (e.g. 212.00000000000003 → 212) without changing meaningful digits. */
function clean(n: number): number {
  return Number(n.toPrecision(12));
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

  const baseValue = fromDef.toBaseFn ? fromDef.toBaseFn(value) : value * fromDef.toBase;
  const fromBase = (u: UnitDefinition) => clean(u.fromBaseFn ? u.fromBaseFn(baseValue) : baseValue / u.toBase);
  const result = fromBase(toDef);
  const allUnits = units.map((u) => ({ unit: u.id, label: u.label, value: fromBase(u) }));

  return { result, allUnits, error: null };
}

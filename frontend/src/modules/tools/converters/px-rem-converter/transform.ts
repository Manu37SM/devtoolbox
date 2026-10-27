import type { TransformResult } from "@/lib/tool-transform";
import type { CssLengthUnit, PxRemOptions } from "./schema";

const LINE_PATTERN = /^(-?(?:\d+(?:\.\d*)?|\.\d+))\s*(px|rem|em|pt|%)?$/i;
const UNITS: CssLengthUnit[] = ["px", "rem", "em", "pt", "%"];

/** px is the pivot. rem/em/% are relative to the base font size; pt is 4/3 px (96dpi). */
export function toPx(value: number, unit: CssLengthUnit, base: number): number {
  switch (unit) {
    case "px":
      return value;
    case "rem":
    case "em":
      return value * base;
    case "pt":
      return (value * 4) / 3;
    case "%":
      return (value / 100) * base;
  }
}

export function fromPx(px: number, unit: CssLengthUnit, base: number): number {
  switch (unit) {
    case "px":
      return px;
    case "rem":
    case "em":
      return px / base;
    case "pt":
      return (px * 3) / 4;
    case "%":
      return (px / base) * 100;
  }
}

/** At most 4 decimals, no trailing zeros, no "-0". */
export function formatNumber(n: number): string {
  const rounded = Math.round(n * 1e4) / 1e4;
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

const withUnit = (n: number, unit: CssLengthUnit) => `${formatNumber(n)}${unit}`;

export function convertCssLengths(input: string, options: PxRemOptions): TransformResult {
  const lines = input.split(/\r?\n/);
  if (lines.every((l) => l.trim() === "")) return { output: "", error: null };

  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (line === "") {
      out.push("");
      continue;
    }
    const m = LINE_PATTERN.exec(line);
    if (!m) {
      return {
        output: "",
        error: { message: `Line ${i + 1}: "${line}" is not a length. Use a number with an optional unit (px, rem, em, pt, %).`, line: i + 1 },
      };
    }
    const unit = (m[2]?.toLowerCase() as CssLengthUnit | undefined) ?? options.defaultUnit;
    const px = toPx(Number(m[1]), unit, options.baseFontSize);

    if (options.target === "all") {
      out.push(UNITS.map((u) => withUnit(fromPx(px, u, options.baseFontSize), u)).join("  =  "));
    } else {
      out.push(withUnit(fromPx(px, options.target, options.baseFontSize), options.target));
    }
  }
  return { output: out.join("\n"), error: null };
}

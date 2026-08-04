import type { CssGradientGeneratorOptions } from "./schema";
import type { TransformResult } from "@/lib/tool-transform";

/** Hand-rolled CSS gradient string generation — pure string formatting, no
 * library or DOM dependency, so this is fully synchronous and trivially
 * testable. Follows the shared `{ output, error }` transform contract. */
export function generateGradientCss(options: CssGradientGeneratorOptions): TransformResult {
  if (options.stops.length < 2) {
    return { output: "", error: { message: "A gradient needs at least 2 color stops." } };
  }

  for (const stop of options.stops) {
    if (stop.position < 0 || stop.position > 100) {
      return { output: "", error: { message: "Stop positions must be between 0 and 100." } };
    }
  }

  const stopsCss = options.stops
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((stop) => `${stop.color} ${stop.position}%`)
    .join(", ");

  const gradient =
    options.type === "linear"
      ? `linear-gradient(${options.angle}deg, ${stopsCss})`
      : options.type === "radial"
        ? `radial-gradient(circle, ${stopsCss})`
        : `conic-gradient(from ${options.angle}deg, ${stopsCss})`;

  return { output: `background: ${gradient};`, error: null };
}

import type { TransformResult } from "@/lib/tool-transform";
import type { CssClampGeneratorOptions } from "./schema";

const round = (n: number) => Number(n.toFixed(4)).toString();

export function generateClamp(_input: string, o: CssClampGeneratorOptions): TransformResult {
  const { minSize, maxSize, minViewport, maxViewport } = o;
  if (maxViewport <= minViewport) return { output: "", error: { message: "Max viewport must be larger than min viewport." } };
  const root = o.rootPx > 0 ? o.rootPx : 16;
  const slope = (maxSize - minSize) / (maxViewport - minViewport); // px per px of viewport
  const interceptPx = minSize - slope * minViewport;
  const lo = Math.min(minSize, maxSize);
  const hi = Math.max(minSize, maxSize);
  const fmt = (px: number) => (o.unit === "rem" ? `${round(px / root)}rem` : `${round(px)}px`);
  const sign = slope < 0 ? "-" : "+";
  const vw = `${round(Math.abs(slope) * 100)}vw`;
  const css = interceptPx === 0
    ? `clamp(${fmt(lo)}, ${round(slope * 100)}vw, ${fmt(hi)})`
    : `clamp(${fmt(lo)}, ${fmt(interceptPx)} ${sign} ${vw}, ${fmt(hi)})`;
  const lines = [`font-size: ${css};`];
  lines.push("", `/* ${round(minSize)}px at ${round(minViewport)}px → ${round(maxSize)}px at ${round(maxViewport)}px viewport */`);
  return { output: lines.join("\n"), error: null };
}

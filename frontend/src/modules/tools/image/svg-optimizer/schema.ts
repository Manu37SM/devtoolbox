import { z } from "zod";

export const svgOptimizerPluginsPresetSchema = z.enum(["default", "safe", "minimal"]);
export type SvgOptimizerPluginsPreset = z.infer<typeof svgOptimizerPluginsPresetSchema>;

export const svgOptimizerOptionsSchema = z.object({

  pluginsPreset: svgOptimizerPluginsPresetSchema.default("default"),

  removeViewBox: z.boolean().default(false),

  multipass: z.boolean().default(true),

  /** Decimal places for numbers in paths and attributes; "default" keeps SVGO's per-plugin defaults. */
  floatPrecision: z.enum(["default", "0", "1", "2", "3", "4", "5"]).default("default"),
  /** Off by default: <title> is the accessible name for inline SVG. */
  removeTitle: z.boolean().default(false),
  /** Drop width/height so the SVG scales with CSS (keeps viewBox). */
  removeDimensions: z.boolean().default(false),
  /** Don't minify or remove IDs (needed when CSS, JS or <use> elsewhere refer to them). */
  keepIds: z.boolean().default(false),
  /** Replace fill/stroke colours with currentColor so icons inherit the text colour. */
  currentColor: z.boolean().default(false),
  /** Prefix IDs and class names so several inlined SVGs on one page don't collide. Empty = off. */
  idPrefix: z.string().max(40).default(""),
  /** Indented output instead of a single line. */
  pretty: z.boolean().default(false),
  /** svg = markup; dataUri = URL-encoded data: URI for CSS; base64 = base64 data: URI. */
  outputFormat: z.enum(["svg", "dataUri", "base64"]).default("svg"),
});
export type SvgOptimizerOptions = z.infer<typeof svgOptimizerOptionsSchema>;

export const svgOptimizerInputSchema = z.string().max(5_000_000);

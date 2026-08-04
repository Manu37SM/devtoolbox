import { z } from "zod";

export const svgOptimizerPluginsPresetSchema = z.enum(["default", "safe", "minimal"]);
export type SvgOptimizerPluginsPreset = z.infer<typeof svgOptimizerPluginsPresetSchema>;

export const svgOptimizerOptionsSchema = z.object({
  /** Maps to svgo's `preset-default` plugin at varying levels of
   * aggressiveness — "default" uses svgo's own preset-default as-is,
   * "safe" disables a couple of plugins known to occasionally change
   * rendering (mergePaths, convertShapeToPath), and "minimal" only runs
   * whitespace/comment/metadata cleanup (no shape/path rewriting). See
   * transform.ts for the exact plugin list each maps to — these three
   * names aren't svgo's own vocabulary, they're this tool's UI-facing
   * simplification of svgo's much larger plugin surface (CLAUDE.md rule:
   * don't invent option names the library doesn't have — these are our
   * own preset *labels*, but they resolve to real svgo plugin configs). */
  pluginsPreset: svgOptimizerPluginsPresetSchema.default("default"),
  /** svgo's preset-default keeps `viewBox` by default (removing it would
   * break responsive scaling) but this exposes the choice explicitly,
   * since some users deliberately want a fixed-size, non-responsive SVG. */
  removeViewBox: z.boolean().default(false),
  /** Run svgo in multipass mode (re-optimizes until no further size
   * reduction — svgo's own `multipass` config option). */
  multipass: z.boolean().default(true),
});
export type SvgOptimizerOptions = z.infer<typeof svgOptimizerOptionsSchema>;

export const svgOptimizerInputSchema = z.string().max(5_000_000);

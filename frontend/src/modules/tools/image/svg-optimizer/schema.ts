import { z } from "zod";

export const svgOptimizerPluginsPresetSchema = z.enum(["default", "safe", "minimal"]);
export type SvgOptimizerPluginsPreset = z.infer<typeof svgOptimizerPluginsPresetSchema>;

export const svgOptimizerOptionsSchema = z.object({

  pluginsPreset: svgOptimizerPluginsPresetSchema.default("default"),

  removeViewBox: z.boolean().default(false),

  multipass: z.boolean().default(true),
});
export type SvgOptimizerOptions = z.infer<typeof svgOptimizerOptionsSchema>;

export const svgOptimizerInputSchema = z.string().max(5_000_000);

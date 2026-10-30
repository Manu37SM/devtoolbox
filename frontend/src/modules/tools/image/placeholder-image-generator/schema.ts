import { z } from "zod";

export const placeholderImageOptionsSchema = z.object({
  width: z.number().int().min(1).max(4000).default(600),
  height: z.number().int().min(1).max(4000).default(400),
  backgroundColor: z.string().default("#94a3b8"),
  textColor: z.string().default("#ffffff"),
  text: z.string().max(100).optional(),
  /** Font size in px; 0 = scale with the image. */
  fontSize: z.number().int().min(0).max(500).default(0),
  /** Rounded corners in px. */
  cornerRadius: z.number().int().min(0).max(2000).default(0),
  /** Background decoration: crossed lines (classic wireframe placeholder) or a grid. */
  pattern: z.enum(["none", "cross", "grid"]).default("none"),
  /** With custom text, also print the dimensions underneath. */
  showDimensions: z.boolean().default(false),
});
export type PlaceholderImageOptions = z.infer<typeof placeholderImageOptionsSchema>;

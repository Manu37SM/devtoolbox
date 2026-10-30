import { z } from "zod";

export const faviconGeneratorOptionsSchema = z.object({
  sizes: z.array(z.number().int().positive()).min(1).default([16, 32, 48, 180, 192, 512]),
  /** Empty space around the artwork, as a percentage of the icon size. */
  padding: z.number().int().min(0).max(40).default(0),
  /** Background fill; empty = transparent. Apple touch icons are always filled (iOS shows black otherwise). */
  background: z.string().default(""),
  /** Corner rounding as a percentage (50 = circle). */
  cornerRadius: z.number().int().min(0).max(50).default(0),
  /** contain = fit inside (letterbox); cover = fill and crop. */
  fit: z.enum(["contain", "cover"]).default("contain"),
  /** basic = PNGs only; full = adds favicon.ico, apple-touch-icon, android-chrome icons, site.webmanifest and an HTML snippet. */
  bundle: z.enum(["basic", "full"]).default("full"),
  /** App name for site.webmanifest. */
  appName: z.string().max(60).default("My App"),
});
export type FaviconGeneratorOptions = z.infer<typeof faviconGeneratorOptionsSchema>;

export const STANDARD_FAVICON_SIZES = [16, 32, 48, 180, 192, 512] as const;

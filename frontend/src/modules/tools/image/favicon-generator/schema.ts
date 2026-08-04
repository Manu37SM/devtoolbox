import { z } from "zod";

/** Standard favicon/PWA icon size bundle: 16/32/48 for classic browser
 * favicons, 180 for apple-touch-icon, 192/512 for the PWA manifest icons
 * already referenced (but not yet generated) by
 * `frontend/public/manifest.json`. Exposed as an option (rather than a
 * hardcoded constant only) since it's simple to do and lets a user drop
 * a size they don't need — but the default set below is the one that
 * matters and is what ToolView pre-selects. */
export const faviconGeneratorOptionsSchema = z.object({
  sizes: z.array(z.number().int().positive()).min(1).default([16, 32, 48, 180, 192, 512]),
});
export type FaviconGeneratorOptions = z.infer<typeof faviconGeneratorOptionsSchema>;

export const STANDARD_FAVICON_SIZES = [16, 32, 48, 180, 192, 512] as const;

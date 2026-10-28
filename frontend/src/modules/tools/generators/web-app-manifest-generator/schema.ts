import { z } from "zod";

export const webAppManifestGeneratorOptionsSchema = z.object({
  display: z.enum(["standalone", "minimal-ui", "fullscreen", "browser"]).default("standalone"),
  orientation: z.enum(["any", "portrait", "landscape"]).default("any"),
  maskableIcons: z.boolean().default(true),
  includeHtml: z.boolean().default(true),
});
export type WebAppManifestGeneratorOptions = z.infer<typeof webAppManifestGeneratorOptionsSchema>;

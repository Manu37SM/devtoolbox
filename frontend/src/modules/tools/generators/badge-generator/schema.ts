import { z } from "zod";

export const badgeGeneratorOptionsSchema = z.object({
  kind: z.enum(["static", "github", "npm", "pypi", "maven-central"]).default("static"),
  format: z.enum(["markdown", "html", "rst", "url"]).default("markdown"),
  style: z.enum(["flat", "flat-square", "plastic", "for-the-badge", "social"]).default("flat"),
});
export type BadgeGeneratorOptions = z.infer<typeof badgeGeneratorOptionsSchema>;

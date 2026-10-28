import { z } from "zod";

export const sitemapXmlGeneratorOptionsSchema = z.object({
  changefreq: z.enum(["none", "always", "hourly", "daily", "weekly", "monthly", "yearly", "never"]).default("none"),
  priority: z.enum(["none", "1.0", "0.8", "0.5", "0.3"]).default("none"),
  dedupe: z.boolean().default(true),
});
export type SitemapXmlGeneratorOptions = z.infer<typeof sitemapXmlGeneratorOptionsSchema>;

export const sitemapXmlGeneratorInputSchema = z.string().max(2_000_000);

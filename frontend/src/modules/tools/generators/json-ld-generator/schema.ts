import { z } from "zod";

export const jsonLdGeneratorOptionsSchema = z.object({
  type: z
    .enum(["Article", "NewsArticle", "BlogPosting", "Product", "Organization", "LocalBusiness", "Person", "WebSite", "BreadcrumbList", "FAQPage", "Event", "Recipe", "VideoObject", "JobPosting", "SoftwareApplication"])
    .default("Article"),
  /** Specific LocalBusiness subtype, e.g. Restaurant, Dentist */
  businessType: z.string().default("LocalBusiness"),
  /** @type used for a plain-text author value */
  authorType: z.enum(["Person", "Organization"]).default("Person"),
  format: z.enum(["script", "json", "minified", "checks"]).default("script"),
  /** Output known numeric properties (price, ratingValue, ...) as JSON numbers */
  numbers: z.boolean().default(true),
  /** Add "@context": "https://schema.org" */
  context: z.boolean().default(true),
});
export type JsonLdGeneratorOptions = z.infer<typeof jsonLdGeneratorOptionsSchema>;

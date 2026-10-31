import { z } from "zod";

export const rssAtomFeedGeneratorOptionsSchema = z.object({
  format: z.enum(["rss", "atom", "json"]).default("rss"),
  /** Put item HTML in CDATA (RSS content:encoded / Atom content) instead of escaping entities */
  cdata: z.boolean().default(true),
  /** Add the xmlns:content / dc / atom namespaces and elements that use them (RSS) */
  extensions: z.boolean().default(true),
  /** Indent the XML / JSON */
  pretty: z.boolean().default(true),
  /** Include the XML declaration */
  declaration: z.boolean().default(true),
  /** Newest items first */
  sortNewestFirst: z.boolean().default(true),
  /** Cap the number of items (0 = all) */
  limit: z.number().int().min(0).max(1000).default(0),
  /** Generator name written to the feed, empty to omit */
  generator: z.string().default(""),
});
export type RssAtomFeedGeneratorOptions = z.infer<typeof rssAtomFeedGeneratorOptionsSchema>;

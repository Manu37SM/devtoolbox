import { z } from "zod";

export const markdownHtmlInputSchema = z.string().max(2_000_000);

export const markdownHtmlOptionsSchema = z.object({
  /** GitHub extensions: tables, ~~strikethrough~~, task lists and bare-URL autolinks. */
  gfm: z.boolean().default(true),
  /** id="slug" on headings (GitHub-style) so #anchors work. */
  headingIds: z.boolean().default(false),
  /** Single newlines inside a paragraph become <br /> (GitHub comments, chat). */
  hardBreaks: z.boolean().default(false),
  /** Links open in a new tab with rel="noopener noreferrer". */
  externalLinks: z.boolean().default(false),
  /** Neutralise javascript:, vbscript: and non-image data: URLs in the generated HTML source. */
  safeUrls: z.boolean().default(true),
  /** Wrap in a complete HTML document (doctype, charset, title, basic styles). */
  fullDocument: z.boolean().default(false),
});
export type MarkdownHtmlOptions = z.infer<typeof markdownHtmlOptionsSchema>;

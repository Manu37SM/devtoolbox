import { z } from "zod";

export const dataUriOptionsSchema = z.object({
  mode: z.enum(["build", "parse"]).default("build"),
  mime: z.string().max(100).default("text/plain"),
  encoding: z.enum(["auto", "base64", "percent"]).default("auto"),
  charset: z.string().max(30).default("utf-8"),
  /** Add ;charset=… to text types */
  includeCharset: z.boolean().default(true),
  /** Strip newlines and collapse whitespace first (handy for SVG/CSS) */
  minify: z.boolean().default(false),
  wrap: z.enum(["none", "css-url", "html-img", "html-link", "markdown-img", "js-string"]).default("none"),
  /** URL-safe base64 alphabet (RFC 4648 §5); not valid in strict data URIs, so off by default */
  urlSafe: z.boolean().default(false),
});
export type DataUriOptions = z.infer<typeof dataUriOptionsSchema>;

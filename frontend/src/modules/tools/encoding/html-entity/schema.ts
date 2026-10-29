import { z } from "zod";

export const htmlEntityOptionsSchema = z.object({
  mode: z.enum(["encode", "decode"]).default("encode"),
  encodeAllNonAscii: z.boolean().default(false),
  /**
   * "basic": &amp; &lt; &gt; &quot; &#39; by name, everything else as decimal (the classic escape).
   * "named": names wherever HTML defines one (&copy;, &eacute;), numeric otherwise.
   * "decimal" / "hex": numeric references only.
   */
  entityStyle: z.enum(["basic", "named", "decimal", "hex"]).default("basic"),
  /** Quotes only need escaping inside attribute values. */
  escapeQuotes: z.boolean().default(true),
});
export type HtmlEntityOptions = z.infer<typeof htmlEntityOptionsSchema>;

export const htmlEntityInputSchema = z.string().max(1_000_000);

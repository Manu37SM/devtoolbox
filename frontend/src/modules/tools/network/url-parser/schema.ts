import { z } from "zod";

/** Options schema for the URL Parser tool. Decoding query params/pathname
 * percent-escapes is the only real knob — everything else about a URL's
 * structure is unambiguous once it's parsed. */
export const urlParserOptionsSchema = z.object({
  decodeComponents: z.boolean().default(true),
});

export type UrlParserOptions = z.infer<typeof urlParserOptionsSchema>;

export const urlParserInputSchema = z.string().max(20_000, {
  message: "Input exceeds the 20,000 character processing limit.",
});

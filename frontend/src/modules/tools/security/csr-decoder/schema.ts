import { z } from "zod";

export const csrDecoderOptionsSchema = z.object({
  dnStyle: z.enum(["openssl", "rfc2253"]).default("openssl"),
  output: z.enum(["summary", "json"]).default("summary"),
  /** Hostnames the request must cover (comma separated). Missing ones are reported. */
  expectNames: z.string().max(2_000).default(""),
  fingerprintStyle: z.enum(["colon", "hex"]).default("colon"),
});
export type CsrDecoderOptions = z.infer<typeof csrDecoderOptionsSchema>;

export const csrDecoderInputSchema = z.string().max(100_000);

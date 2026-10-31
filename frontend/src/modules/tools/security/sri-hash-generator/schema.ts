import { z } from "zod";

export const sriHashGeneratorOptionsSchema = z.object({
  action: z.enum(["generate", "verify"]).default("generate"),
  algorithms: z.array(z.enum(["sha256", "sha384", "sha512"])).default(["sha384"]),
  /** How the input should be read */
  inputKind: z.enum(["text", "hex", "base64"]).default("text"),
  /** SRI hashes the exact bytes, so CRLF vs LF changes the digest */
  lineEndings: z.enum(["keep", "lf", "crlf"]).default("keep"),
  /** What to print */
  format: z.enum(["integrity", "script", "link", "csp", "json"]).default("integrity"),
  /** src / href used when building tags */
  url: z.string().default("https://cdn.example.com/lib.min.js"),
  crossorigin: z.enum(["anonymous", "use-credentials", "none"]).default("anonymous"),
  /** Existing integrity attribute value to compare with (verify action) */
  expected: z.string().default(""),
  /** End the output with a newline (handy when piping into files) */
  trailingNewline: z.boolean().default(false),
});
export type SriHashGeneratorOptions = z.infer<typeof sriHashGeneratorOptionsSchema>;

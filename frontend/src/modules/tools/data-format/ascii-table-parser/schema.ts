import { z } from "zod";

export const asciiTableParserOptionsSchema = z.object({
  output: z.enum(["json", "csv", "tsv", "markdown", "yaml"]).default("json"),
  inferTypes: z.boolean().default(true),
});
export type AsciiTableParserOptions = z.infer<typeof asciiTableParserOptionsSchema>;

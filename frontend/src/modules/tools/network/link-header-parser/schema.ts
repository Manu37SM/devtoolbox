import { z } from "zod";

export const linkHeaderParserOptionsSchema = z.object({
  format: z.enum(["table", "json"]).default("table"),
});
export type LinkHeaderParserOptions = z.infer<typeof linkHeaderParserOptionsSchema>;

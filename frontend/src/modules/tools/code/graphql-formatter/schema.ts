import { z } from "zod";

export const graphqlFormatterOptionsSchema = z.object({
  mode: z.enum(["format", "minify"]).default("format"),
  indent: z.enum(["2", "4", "tab"]).default("2"),
});
export type GraphqlFormatterOptions = z.infer<typeof graphqlFormatterOptionsSchema>;

export const graphqlFormatterInputSchema = z.string().max(2_000_000);

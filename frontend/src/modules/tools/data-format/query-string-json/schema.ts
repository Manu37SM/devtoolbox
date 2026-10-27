import { z } from "zod";

export const queryStringJsonOptionsSchema = z.object({
  mode: z.enum(["qs-to-json", "json-to-qs"]).default("qs-to-json"),
  nested: z.boolean().default(true),
  parseValues: z.boolean().default(false),
  arrayStyle: z.enum(["repeat", "brackets"]).default("repeat"),
});
export type QueryStringJsonOptions = z.infer<typeof queryStringJsonOptionsSchema>;

export const queryStringJsonInputSchema = z.string().max(1_000_000);

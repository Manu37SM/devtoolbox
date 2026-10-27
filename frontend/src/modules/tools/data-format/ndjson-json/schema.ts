import { z } from "zod";

export const ndjsonJsonOptionsSchema = z.object({
  mode: z.enum(["ndjson-to-json", "json-to-ndjson"]).default("ndjson-to-json"),
  indent: z.enum(["0", "2", "4"]).default("2"),
});
export type NdjsonJsonOptions = z.infer<typeof ndjsonJsonOptionsSchema>;

export const ndjsonJsonInputSchema = z.string().max(1000000);

import { z } from "zod";

export const jsonFlattenOptionsSchema = z.object({
  direction: z.enum(["flatten", "unflatten"]).default("flatten"),
  delimiter: z.enum([".", "/", "_", ":"]).default("."),
  arrays: z.enum(["brackets", "delimited"]).default("brackets"),
  indent: z.enum(["2", "4", "tab", "min"]).default("2"),
});
export type JsonFlattenOptions = z.infer<typeof jsonFlattenOptionsSchema>;

export const jsonFlattenInputSchema = z.string().max(5_000_000);

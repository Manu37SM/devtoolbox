import { z } from "zod";

export const json5JsoncConverterOptionsSchema = z.object({
  direction: z.enum(["to-json", "to-json5"]).default("to-json"),
  indent: z.enum(["2", "4", "tab"]).default("2"),
  trailingCommas: z.boolean().default(false),
});
export type Json5JsoncConverterOptions = z.infer<typeof json5JsoncConverterOptionsSchema>;

export const json5JsoncConverterInputSchema = z.string().max(5_000_000);

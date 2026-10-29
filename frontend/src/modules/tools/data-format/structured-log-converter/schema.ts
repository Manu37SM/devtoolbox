import { z } from "zod";

export const structuredLogConverterOptionsSchema = z.object({
  output: z.enum(["pretty", "json", "logfmt"]).default("pretty"),
  minLevel: z.enum(["all", "debug", "info", "warn", "error"]).default("all"),
});
export type StructuredLogConverterOptions = z.infer<typeof structuredLogConverterOptionsSchema>;

import { z } from "zod";

export const iniJsonConverterOptionsSchema = z.object({
  direction: z.enum(["ini-to-json", "json-to-ini"]).default("ini-to-json"),
  inferTypes: z.boolean().default(true),
  nestDotted: z.boolean().default(false),
  indent: z.enum(["2", "4", "tab", "min"]).default("2"),
});
export type IniJsonConverterOptions = z.infer<typeof iniJsonConverterOptionsSchema>;

export const iniJsonConverterInputSchema = z.string().max(2_000_000);

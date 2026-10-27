import { z } from "zod";

export const binaryTextConverterOptionsSchema = z.object({
  mode: z.enum(["encode", "decode"]).default("encode"),
  base: z.enum(["2", "8", "10"]).default("2"),
});
export type BinaryTextConverterOptions = z.infer<typeof binaryTextConverterOptionsSchema>;

export const binaryTextConverterInputSchema = z.string().max(1000000);

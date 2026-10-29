import { z } from "zod";

export const packedDecimalConverterOptionsSchema = z.object({
  direction: z.enum(["decode", "encode"]).default("decode"),
  format: z.enum(["comp-3", "zoned", "comp"]).default("comp-3"),
  pic: z.string().default("S9(7)V99"),
});
export type PackedDecimalConverterOptions = z.infer<typeof packedDecimalConverterOptionsSchema>;

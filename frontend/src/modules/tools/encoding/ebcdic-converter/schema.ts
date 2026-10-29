import { z } from "zod";

export const ebcdicConverterOptionsSchema = z.object({
  direction: z.enum(["to-ebcdic", "from-ebcdic"]).default("to-ebcdic"),
  codePage: z.enum(["037", "1047", "500", "1140", "273"]).default("037"),
  newline: z.enum(["nl", "lf"]).default("nl"),
});
export type EbcdicConverterOptions = z.infer<typeof ebcdicConverterOptionsSchema>;

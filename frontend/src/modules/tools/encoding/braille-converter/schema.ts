import { z } from "zod";

export const brailleConverterOptionsSchema = z.object({
  mode: z.enum(["encode", "decode"]).default("encode"),
  /** unicode: ⠓⠑⠇⠇⠕ · ascii: Braille ASCII (BRF) */
  cells: z.enum(["unicode", "ascii"]).default("unicode"),
  /** also list each cell's dot numbers under the output */
  dots: z.boolean().default(false),
});
export type BrailleConverterOptions = z.infer<typeof brailleConverterOptionsSchema>;

import { z } from "zod";

export const base85UuencodeConverterOptionsSchema = z.object({
  action: z.enum(["encode", "decode"]).default("encode"),
  format: z.enum(["ascii85", "adobe", "rfc1924", "z85", "uuencode"]).default("ascii85"),
  /** Encode: how the input is read */
  inputKind: z.enum(["text", "hex"]).default("text"),
  /** Decode: how the bytes are shown */
  outputKind: z.enum(["text", "hex"]).default("text"),
  /** Wrap encoded output every N characters (0 = single line); uuencode always uses 60-character lines */
  wrap: z.number().int().min(0).max(1000).default(0),
  fileName: z.string().default("data.bin"),
  fileMode: z.string().default("644"),
  /** uuencode: write zero as ` instead of space (what modern uuencode does) */
  backtick: z.boolean().default(true),
});
export type Base85UuencodeConverterOptions = z.infer<typeof base85UuencodeConverterOptionsSchema>;

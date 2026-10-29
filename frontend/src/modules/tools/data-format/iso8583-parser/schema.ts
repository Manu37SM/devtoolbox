import { z } from "zod";

export const iso8583ParserOptionsSchema = z.object({
  encoding: z.enum(["ascii", "ascii-binary-bitmap", "bcd"]).default("ascii"),
  maskSensitive: z.boolean().default(true),
});
export type Iso8583ParserOptions = z.infer<typeof iso8583ParserOptionsSchema>;

import { z } from "zod";

export const asn1DerDecoderOptionsSchema = z.object({
  inputMode: z.enum(["auto", "hex", "base64"]).default("auto"),
  decodeEncapsulated: z.boolean().default(true),
  showOffsets: z.boolean().default(true),
});
export type Asn1DerDecoderOptions = z.infer<typeof asn1DerDecoderOptionsSchema>;

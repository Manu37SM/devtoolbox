import { z } from "zod";

export const emvTlvDecoderOptionsSchema = z.object({
  maskSensitive: z.boolean().default(true),
  explainBits: z.boolean().default(true),
});
export type EmvTlvDecoderOptions = z.infer<typeof emvTlvDecoderOptionsSchema>;

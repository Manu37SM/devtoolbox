import { z } from "zod";

export const protobufBinaryDecoderOptionsSchema = z.object({
  inputMode: z.enum(["auto", "hex", "base64"]).default("auto"),
  showAlternatives: z.boolean().default(true),
  grpcFrame: z.boolean().default(false),
});
export type ProtobufBinaryDecoderOptions = z.infer<typeof protobufBinaryDecoderOptionsSchema>;

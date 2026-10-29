import { z } from "zod";

export const msgpackCborJsonOptionsSchema = z.object({
  format: z.enum(["msgpack", "cbor"]).default("msgpack"),
  direction: z.enum(["decode", "encode"]).default("decode"),
  outputEncoding: z.enum(["hex", "base64"]).default("hex"),
});
export type MsgpackCborJsonOptions = z.infer<typeof msgpackCborJsonOptionsSchema>;

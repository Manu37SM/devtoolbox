import { z } from "zod";

export const base64OptionsSchema = z.object({
  mode: z.enum(["encode", "decode"]).default("encode"),
  urlSafe: z.boolean().default(false),
  /** Encode: read the input as UTF-8 text or as hex bytes (keys, binary payloads). */
  inputFormat: z.enum(["text", "hex"]).default("text"),
  /** Decode: "auto" shows text when the bytes are valid UTF-8 and hex otherwise, so binary is never mangled. */
  decodeAs: z.enum(["auto", "text", "hex"]).default("auto"),
  /** Encode: wrap lines at 64 (PEM) or 76 (MIME) characters; 0 = one line. */
  lineLength: z.union([z.literal(0), z.literal(64), z.literal(76)]).default(0),
  /** Encode: "auto" pads standard Base64 and leaves Base64URL unpadded (as JWT does). */
  padding: z.enum(["auto", "always", "never"]).default("auto"),
});
export type Base64Options = z.infer<typeof base64OptionsSchema>;

export const base64InputSchema = z.string().max(5_000_000, {
  message: "Input exceeds the 5MB client-side processing limit.",
});

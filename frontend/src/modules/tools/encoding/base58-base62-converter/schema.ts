import { z } from "zod";

export const base58Base62ConverterOptionsSchema = z.object({
  direction: z.enum(["encode", "decode"]).default("encode"),
  alphabet: z.enum(["base58", "flickr", "ripple", "base62"]).default("base58"),
  binaryFormat: z.enum(["text", "hex"]).default("text"),
});
export type Base58Base62ConverterOptions = z.infer<typeof base58Base62ConverterOptionsSchema>;

export const base58Base62ConverterInputSchema = z.string().max(200_000);

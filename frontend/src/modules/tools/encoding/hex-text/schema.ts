import { z } from "zod";

export const hexTextOptionsSchema = z.object({
  mode: z.enum(["text-to-hex", "hex-to-text", "text-to-binary", "binary-to-text"]).default("text-to-hex"),
  hexSeparator: z.enum(["none", "space"]).default("space"),
});
export type HexTextOptions = z.infer<typeof hexTextOptionsSchema>;

export const hexTextInputSchema = z.string().max(5_000_000, {
  message: "Input exceeds the 5MB client-side processing limit.",
});

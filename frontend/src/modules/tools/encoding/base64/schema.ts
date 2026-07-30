import { z } from "zod";

export const base64OptionsSchema = z.object({
  mode: z.enum(["encode", "decode"]).default("encode"),
  urlSafe: z.boolean().default(false),
});
export type Base64Options = z.infer<typeof base64OptionsSchema>;

export const base64InputSchema = z.string().max(5_000_000, {
  message: "Input exceeds the 5MB client-side processing limit.",
});

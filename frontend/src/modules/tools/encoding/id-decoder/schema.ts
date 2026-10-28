import { z } from "zod";

export const idDecoderOptionsSchema = z.object({
  mode: z.enum(["auto", "uuid", "ulid", "objectid", "twitter", "discord"]).default("auto"),
});
export type IdDecoderOptions = z.infer<typeof idDecoderOptionsSchema>;

export const idDecoderInputSchema = z.string().max(100_000);

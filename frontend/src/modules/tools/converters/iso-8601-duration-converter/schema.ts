import { z } from "zod";

export const isoDurationOptionsSchema = z.object({
  mode: z.enum(["iso-to-human", "iso-to-seconds", "seconds-to-iso"]).default("iso-to-human"),
});
export type IsoDurationOptions = z.infer<typeof isoDurationOptionsSchema>;

export const isoDurationInputSchema = z.string().max(1_000);

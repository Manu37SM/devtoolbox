import { z } from "zod";

export const durationConverterOptionsSchema = z.object({
  defaultUnit: z.enum(["ms", "s", "min", "h", "d"]).default("s"),
});
export type DurationConverterOptions = z.infer<typeof durationConverterOptionsSchema>;

export const durationConverterInputSchema = z.string().max(100_000);

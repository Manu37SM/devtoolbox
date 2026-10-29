import { z } from "zod";

export const samlDecoderOptionsSchema = z.object({
  output: z.enum(["summary", "xml", "both"]).default("both"),
});
export type SamlDecoderOptions = z.infer<typeof samlDecoderOptionsSchema>;

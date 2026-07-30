import { z } from "zod";

export const xmlFormatterOptionsSchema = z.object({
  indent: z.union([z.literal(2), z.literal(4)]).default(2),
});
export type XmlFormatterOptions = z.infer<typeof xmlFormatterOptionsSchema>;

export const xmlFormatterInputSchema = z.string().max(5_000_000);

import { z } from "zod";

export const javaDateFormatConverterOptionsSchema = z.object({
  from: z.enum(["java", "strftime", "moment", "oracle"]).default("java"),
  showSample: z.boolean().default(true),
});
export type JavaDateFormatConverterOptions = z.infer<typeof javaDateFormatConverterOptionsSchema>;

export const javaDateFormatConverterInputSchema = z.string().max(100000);

import { z } from "zod";

export const mimeTypesOptionsSchema = z.object({
  format: z.enum(["ext-first", "mime-first"]).default("ext-first"),
});
export type MimeTypesOptions = z.infer<typeof mimeTypesOptionsSchema>;

export const mimeTypesInputSchema = z.string().max(1000000);

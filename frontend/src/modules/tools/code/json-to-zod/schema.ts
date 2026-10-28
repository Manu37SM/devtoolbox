import { z } from "zod";

export const jsonToZodOptionsSchema = z.object({
  style: z.enum(["named", "inline"]).default("named"),
  detectFormats: z.boolean().default(true),
  strict: z.boolean().default(false),
  exportTypes: z.boolean().default(true),
});
export type JsonToZodOptions = z.infer<typeof jsonToZodOptionsSchema>;

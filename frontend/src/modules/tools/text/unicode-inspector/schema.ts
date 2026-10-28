import { z } from "zod";

export const unicodeInspectorOptionsSchema = z.object({
  mode: z.enum(["table", "invisible", "escapes"]).default("table"),
});
export type UnicodeInspectorOptions = z.infer<typeof unicodeInspectorOptionsSchema>;

export const unicodeInspectorInputSchema = z.string().max(50_000);

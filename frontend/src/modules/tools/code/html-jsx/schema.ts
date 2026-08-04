import { z } from "zod";

export const htmlJsxOptionsSchema = z.object({
  selfClosingVoidElements: z.boolean().default(true),
});
export type HtmlJsxOptions = z.infer<typeof htmlJsxOptionsSchema>;

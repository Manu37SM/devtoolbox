import { z } from "zod";

export const templateBulkGeneratorOptionsSchema = z.object({
  separator: z.enum(["newline", "blank-line", "none", "comma"]).default("newline"),
  missing: z.enum(["empty", "keep", "error"]).default("error"),
});
export type TemplateBulkGeneratorOptions = z.infer<typeof templateBulkGeneratorOptionsSchema>;

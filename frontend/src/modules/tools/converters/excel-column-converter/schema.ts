import { z } from "zod";

export const excelColumnConverterOptionsSchema = z.object({
  zeroBased: z.boolean().default(false),
});
export type ExcelColumnConverterOptions = z.infer<typeof excelColumnConverterOptionsSchema>;

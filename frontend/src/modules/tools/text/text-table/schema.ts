import { z } from "zod";

export const textTableFromFormatSchema = z.enum(["markdown", "csv", "tsv"]);
export type TextTableFromFormat = z.infer<typeof textTableFromFormatSchema>;

export const textTableToFormatSchema = z.enum(["markdown", "csv", "tsv", "ascii"]);
export type TextTableToFormat = z.infer<typeof textTableToFormatSchema>;

export const textTableOptionsSchema = z.object({
  from: textTableFromFormatSchema.default("csv"),
  to: textTableToFormatSchema.default("markdown"),
});
export type TextTableOptions = z.infer<typeof textTableOptionsSchema>;

export const textTableInputSchema = z.string().max(10_000_000);

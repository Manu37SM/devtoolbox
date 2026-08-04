import { z } from "zod";

export const sqlFormatterOptionsSchema = z.object({
  dialect: z.enum(["sql", "postgresql", "mysql", "sqlite", "mariadb", "bigquery"]).default("sql"),
  keywordCase: z.enum(["preserve", "upper", "lower"]).default("upper"),
  tabWidth: z.number().default(2),
});
export type SqlFormatterOptions = z.infer<typeof sqlFormatterOptionsSchema>;

export const sqlFormatterInputSchema = z.string().max(5_000_000, {
  message: "Input exceeds the 5MB client-side processing limit.",
});

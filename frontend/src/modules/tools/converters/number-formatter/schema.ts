import { z } from "zod";

export const NUMBER_LOCALES = ["en-US", "en-IN", "en-GB", "de-DE", "fr-FR", "es-ES", "pt-BR", "ja-JP", "zh-CN", "ar-EG", "ru-RU", "hi-IN"] as const;
export const NUMBER_CURRENCIES = ["USD", "EUR", "INR", "GBP", "JPY", "CHF", "BRL", "CNY", "AED", "AUD", "CAD"] as const;

export const numberFormatterOptionsSchema = z.object({
  locale: z.enum(NUMBER_LOCALES).default("en-US"),
  style: z.enum(["decimal", "currency", "percent"]).default("decimal"),
  currency: z.enum(NUMBER_CURRENCIES).default("USD"),
  notation: z.enum(["standard", "compact", "scientific", "engineering"]).default("standard"),
  compactDisplay: z.enum(["short", "long"]).default("short"),
  minFraction: z.number().int().min(0).max(20).default(0),
  maxFraction: z.number().int().min(0).max(20).default(3),
  grouping: z.boolean().default(true),
  compareLocales: z.boolean().default(false),
});
export type NumberFormatterOptions = z.infer<typeof numberFormatterOptionsSchema>;

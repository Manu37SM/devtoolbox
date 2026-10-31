import { z } from "zod";

export const sequenceGeneratorOptionsSchema = z.object({
  kind: z.enum(["numbers", "letters", "dates", "template"]).default("numbers"),
  /** numbers / template: first value */
  start: z.number().default(1),
  /** numbers: last value (inclusive). Ignored when "count" is set to a value above 0 */
  end: z.number().default(10),
  step: z.number().default(1),
  /** How many items to produce; 0 = go until "end" */
  count: z.number().int().min(0).max(100000).default(0),
  /** Minimum width for integers, filled with zeros */
  padWidth: z.number().int().min(0).max(30).default(0),
  decimals: z.number().int().min(0).max(10).default(0),
  prefix: z.string().max(50).default(""),
  suffix: z.string().max(50).default(""),
  /** letters: spreadsheet style a..z, aa..az */
  letterFrom: z.string().max(10).default("a"),
  letterCase: z.enum(["lower", "upper", "keep"]).default("lower"),
  /** dates */
  startDate: z.string().max(20).default("2026-01-01"),
  dateStepUnit: z.enum(["day", "week", "month", "quarter", "year"]).default("day"),
  dateFormat: z.string().max(50).default("yyyy-MM-dd"),
  weekdaysOnly: z.boolean().default(false),
  /** template: "item-{n}" , "{n:3}" pads to 3 digits, "{a}" letter, "{A}" upper letter */
  template: z.string().max(200).default("item-{n:3}"),
  reverse: z.boolean().default(false),
  shuffle: z.boolean().default(false),
  /** 0 = unpredictable; any other number gives a repeatable shuffle */
  seed: z.number().int().min(0).max(2147483647).default(0),
  separator: z.enum(["newline", "comma", "comma-space", "space", "tab", "semicolon", "pipe", "custom"]).default("newline"),
  customSeparator: z.string().max(20).default(""),
  quote: z.enum(["none", "single", "double"]).default("none"),
});
export type SequenceGeneratorOptions = z.infer<typeof sequenceGeneratorOptionsSchema>;
